//! Leituras reais e sem privilégio do sistema.
//!
//! Tudo aqui é somente leitura e degrada para `None`/lista vazia quando a
//! ferramenta não existe; a interface então cai nos dados de demonstração.

use std::collections::HashMap;
use std::fs;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use serde_json::Value;

fn run(program: &str, args: &[&str]) -> Option<String> {
    let output = Command::new(program)
        .args(args)
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .output()
        .ok()?;
    output
        .status
        .success()
        .then(|| String::from_utf8_lossy(&output.stdout).into_owned())
}

fn read_trimmed(path: &str) -> Option<String> {
    fs::read_to_string(path).ok().map(|s| s.trim().to_owned())
}

/// Valores de /proc/meminfo em bytes.
fn meminfo() -> HashMap<String, u64> {
    fs::read_to_string("/proc/meminfo")
        .unwrap_or_default()
        .lines()
        .filter_map(|line| {
            let (key, rest) = line.split_once(':')?;
            let kib: u64 = rest.split_whitespace().next()?.parse().ok()?;
            Some((key.to_owned(), kib * 1024))
        })
        .collect()
}

fn os_release() -> HashMap<String, String> {
    fs::read_to_string("/etc/os-release")
        .unwrap_or_default()
        .lines()
        .filter_map(|line| {
            let (key, value) = line.split_once('=')?;
            Some((key.to_owned(), value.trim_matches('"').to_owned()))
        })
        .collect()
}

fn root_usage() -> (u64, u64) {
    run("/usr/bin/df", &["-B1", "--output=size,used", "/"])
        .and_then(|out| {
            let mut fields = out.lines().nth(1)?.split_whitespace();
            Some((fields.next()?.parse().ok()?, fields.next()?.parse().ok()?))
        })
        .unwrap_or((0, 0))
}

#[derive(Serialize)]
pub struct Overview {
    hostname: String,
    os_name: String,
    kernel: String,
    arch: String,
    uptime_secs: u64,
    cpu_model: String,
    cpu_threads: usize,
    mem_total: u64,
    disk_total: u64,
    disk_used: u64,
}

#[tauri::command]
pub fn overview() -> Overview {
    let cpuinfo = fs::read_to_string("/proc/cpuinfo").unwrap_or_default();
    let cpu_model = cpuinfo
        .lines()
        .find_map(|l| l.strip_prefix("model name"))
        .and_then(|l| l.split_once(':'))
        .map(|(_, v)| v.trim().to_owned())
        .unwrap_or_default();
    let cpu_threads = cpuinfo.lines().filter(|l| l.starts_with("processor")).count();
    let uptime_secs = read_trimmed("/proc/uptime")
        .and_then(|s| s.split_whitespace().next()?.parse::<f64>().ok())
        .unwrap_or(0.0) as u64;
    let release = os_release();
    let (disk_total, disk_used) = root_usage();

    Overview {
        hostname: read_trimmed("/proc/sys/kernel/hostname").unwrap_or_default(),
        os_name: release.get("PRETTY_NAME").cloned().unwrap_or_default(),
        kernel: read_trimmed("/proc/sys/kernel/osrelease").unwrap_or_default(),
        arch: std::env::consts::ARCH.to_owned(),
        uptime_secs,
        cpu_model,
        cpu_threads,
        mem_total: meminfo().get("MemTotal").copied().unwrap_or(0),
        disk_total,
        disk_used,
    }
}

/// Guarda a amostra anterior de /proc/stat para calcular o uso de CPU entre
/// duas chamadas, como o `Monitor.Metrics` do vegad faz.
#[derive(Default)]
pub struct Sampler {
    cpu: Mutex<Option<(u64, u64)>>,
}

#[derive(Serialize)]
pub struct Metrics {
    timestamp_ms: u128,
    cpu_percent: f64,
    mem_total: u64,
    mem_used: u64,
    swap_total: u64,
    swap_used: u64,
    load: [f64; 3],
    net_rx: u64,
    net_tx: u64,
}

fn cpu_times() -> Option<(u64, u64)> {
    let stat = fs::read_to_string("/proc/stat").ok()?;
    let values: Vec<u64> = stat
        .lines()
        .next()?
        .split_whitespace()
        .skip(1)
        .filter_map(|v| v.parse().ok())
        .collect();
    let idle = values.get(3)? + values.get(4).unwrap_or(&0);
    Some((idle, values.iter().sum()))
}

fn net_totals() -> (u64, u64) {
    fs::read_to_string("/proc/net/dev")
        .unwrap_or_default()
        .lines()
        .skip(2)
        .filter_map(|line| {
            let (iface, rest) = line.split_once(':')?;
            if iface.trim() == "lo" {
                return None;
            }
            let fields: Vec<u64> = rest.split_whitespace().filter_map(|v| v.parse().ok()).collect();
            Some((*fields.first()?, *fields.get(8)?))
        })
        .fold((0, 0), |(rx, tx), (r, t)| (rx + r, tx + t))
}

#[tauri::command]
pub fn metrics(sampler: tauri::State<'_, Sampler>) -> Metrics {
    let now = cpu_times();
    let mut previous = sampler.cpu.lock().expect("sampler envenenado");
    let cpu_percent = match (*previous, now) {
        (Some((idle0, total0)), Some((idle1, total1))) if total1 > total0 => {
            100.0 * (1.0 - (idle1 - idle0) as f64 / (total1 - total0) as f64)
        }
        _ => 0.0,
    };
    *previous = now;

    let mem = meminfo();
    let get = |key: &str| mem.get(key).copied().unwrap_or(0);
    let mut load = [0.0; 3];
    if let Some(text) = read_trimmed("/proc/loadavg") {
        for (slot, value) in load.iter_mut().zip(text.split_whitespace()) {
            *slot = value.parse().unwrap_or(0.0);
        }
    }
    let (net_rx, net_tx) = net_totals();

    Metrics {
        timestamp_ms: SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0),
        cpu_percent,
        mem_total: get("MemTotal"),
        mem_used: get("MemTotal").saturating_sub(get("MemAvailable")),
        swap_total: get("SwapTotal"),
        swap_used: get("SwapTotal").saturating_sub(get("SwapFree")),
        load,
        net_rx,
        net_tx,
    }
}

#[derive(Serialize)]
pub struct Process {
    pid: u32,
    user: String,
    cpu: f64,
    mem: f64,
    rss: u64,
    name: String,
}

#[tauri::command]
pub fn processes() -> Vec<Process> {
    let Some(out) = run("/usr/bin/ps", &["-eo", "pid=,user=,%cpu=,%mem=,rss=,comm=", "--sort=-%cpu"]) else {
        return Vec::new();
    };
    out.lines()
        .filter_map(|line| {
            let mut fields = line.split_whitespace();
            Some(Process {
                pid: fields.next()?.parse().ok()?,
                user: fields.next()?.to_owned(),
                cpu: fields.next()?.parse().ok()?,
                mem: fields.next()?.parse().ok()?,
                rss: fields.next()?.parse::<u64>().ok()? * 1024,
                name: fields.collect::<Vec<_>>().join(" "),
            })
        })
        .take(150)
        .collect()
}

/// Unidades de serviço com o estado de habilitação mesclado.
#[tauri::command]
pub fn services() -> Vec<Value> {
    let parse = |args: &[&str]| -> Vec<Value> {
        run("/usr/bin/systemctl", args)
            .and_then(|out| serde_json::from_str(&out).ok())
            .unwrap_or_default()
    };
    let units = parse(&["list-units", "--type=service", "--all", "-o", "json", "--no-pager"]);
    let files: HashMap<String, String> = parse(&["list-unit-files", "--type=service", "-o", "json", "--no-pager"])
        .into_iter()
        .filter_map(|f| Some((f["unit_file"].as_str()?.to_owned(), f["state"].as_str()?.to_owned())))
        .collect();

    units
        .into_iter()
        .map(|mut unit| {
            let enablement = unit["unit"]
                .as_str()
                .and_then(|name| files.get(name))
                .cloned()
                .unwrap_or_else(|| "static".to_owned());
            unit["enabled"] = Value::String(enablement);
            unit
        })
        .collect()
}

#[derive(Serialize)]
pub struct LogEntry {
    ts: u64,
    priority: u8,
    ident: String,
    unit: String,
    message: String,
}

#[tauri::command]
pub fn journal(limit: u32, priority: u8) -> Vec<LogEntry> {
    let limit = limit.clamp(10, 2000).to_string();
    let priority = format!("0..{}", priority.min(7));
    let Some(out) = run(
        "/usr/bin/journalctl",
        &["-o", "json", "-n", &limit, "-p", &priority, "--no-pager", "-r"],
    ) else {
        return Vec::new();
    };
    out.lines()
        .filter_map(|line| {
            let entry: Value = serde_json::from_str(line).ok()?;
            let text = |key: &str| entry[key].as_str().unwrap_or_default().to_owned();
            // MESSAGE vem como array de bytes quando não é UTF-8 válido.
            let message = entry["MESSAGE"].as_str()?.to_owned();
            Some(LogEntry {
                ts: text("__REALTIME_TIMESTAMP").parse::<u64>().ok()? / 1000,
                priority: text("PRIORITY").parse().unwrap_or(6),
                ident: entry["SYSLOG_IDENTIFIER"].as_str().map(str::to_owned).unwrap_or_else(|| text("_COMM")),
                unit: text("_SYSTEMD_UNIT"),
                message,
            })
        })
        .collect()
}

#[tauri::command]
pub fn volumes() -> Value {
    run(
        "/usr/bin/lsblk",
        &["-J", "-b", "-o", "NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE,LABEL,FSUSED,FSSIZE,MODEL,TRAN,RM"],
    )
    .and_then(|out| serde_json::from_str(&out).ok())
    .unwrap_or(Value::Null)
}

#[derive(Serialize)]
pub struct DesktopPrefs {
    color_scheme: String,
    accent: String,
}

/// Esquema de cor e cor de destaque do GNOME, para a interface acompanhar o
/// desktop como um app libadwaita faria.
#[tauri::command]
pub fn desktop_prefs() -> DesktopPrefs {
    let get = |key: &str| {
        run("/usr/bin/gsettings", &["get", "org.gnome.desktop.interface", key])
            .map(|v| v.trim().trim_matches('\'').to_owned())
            .unwrap_or_default()
    };
    DesktopPrefs { color_scheme: get("color-scheme"), accent: get("accent-color") }
}
