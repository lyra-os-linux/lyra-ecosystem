//! Tarefas longas simuladas.
//!
//! Reproduz a forma como o vegad reporta operações demoradas (fases, progresso
//! e linhas de log), para validar o fluxo de UX: a interface nunca bloqueia e
//! acompanha tudo por eventos.

use std::sync::atomic::{AtomicU64, Ordering};
use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Default)]
pub struct Jobs {
    next: AtomicU64,
}

#[derive(Clone, Serialize)]
struct JobEvent {
    id: u64,
    kind: String,
    title: String,
    state: &'static str,
    percent: f64,
    step: String,
    log: Option<String>,
}

/// (fase, linhas de log, duração aproximada em ms)
fn script(kind: &str) -> Vec<(&'static str, Vec<&'static str>, u64)> {
    match kind {
        "update" => vec![
            ("Criando ponto de restauração", vec!["snapper create --type pre --description \"vega: atualização\"", "Snapshot pré #418 criado"], 1400),
            ("Atualizando repositórios", vec!["Recuperando metadados de repo-oss", "Recuperando metadados de repo-update", "Recuperando metadados de lyra"], 1800),
            ("Baixando pacotes", vec!["Baixando mesa-25.1.4 (6,2 MiB)", "Baixando kernel-default-6.12.0-160100.9 (98,1 MiB)", "Baixando firefox-esr-140.4 (71,4 MiB)", "Baixando 19 outros pacotes"], 3600),
            ("Verificando assinaturas", vec!["Todas as assinaturas GPG conferem"], 900),
            ("Instalando", vec!["(1/22) Instalando libdrm2", "(8/22) Instalando mesa", "(14/22) Instalando kernel-default", "(22/22) Instalando vega-gtk"], 4200),
            ("Finalizando", vec!["dracut: gerando initrd", "Snapshot pós #419 criado", "Reinicialização recomendada: novo kernel"], 1500),
        ],
        "nvidia" => vec![
            ("Criando ponto de restauração obrigatório", vec!["Snapshot pré #420 criado (importante)"], 1300),
            ("Adicionando repositório NVIDIA", vec!["Chave GPG da NVIDIA verificada"], 1200),
            ("Instalando driver G06", vec!["nvidia-open-driver-G06-signed-kmp-default", "nvidia-video-G06", "nvidia-gl-G06"], 4800),
            ("Verificando módulo assinado pela SUSE", vec!["modinfo: signer SUSE Linux Enterprise Secure Boot Signkey"], 1200),
            ("Finalizando", vec!["Reinicie para carregar o driver"], 900),
        ],
        "backup" => vec![
            ("Preparando", vec!["restic: abrindo repositório /mnt/backup/restic"], 900),
            ("Enviando arquivos", vec!["/home: 48 213 arquivos verificados", "1,2 GiB novos, 18,4 GiB inalterados"], 4200),
            ("Verificando", vec!["snapshot 7c1e93fa salvo"], 1100),
        ],
        "kernel" => vec![
            ("Criando ponto de restauração", vec!["Snapshot pré #421 criado"], 1100),
            ("Instalando kernel", vec!["kernel-default-6.12.0-160100.9"], 3200),
            ("Atualizando bootloader", vec!["sdbootutil add-kernel 6.12.0-160100.9-default"], 1300),
        ],
        _ => vec![("Executando", vec!["Concluído"], 2000)],
    }
}

#[tauri::command]
pub fn start_job(app: AppHandle, jobs: tauri::State<'_, Jobs>, kind: String, title: String) -> u64 {
    let id = jobs.next.fetch_add(1, Ordering::Relaxed) + 1;
    thread::spawn(move || {
        let steps = script(&kind);
        let total: u64 = steps.iter().map(|(_, _, ms)| ms).sum();
        let mut elapsed = 0;
        let emit = |state, percent, step: &str, log: Option<&str>| {
            let _ = app.emit(
                "vega-job",
                JobEvent {
                    id,
                    kind: kind.clone(),
                    title: title.clone(),
                    state,
                    percent,
                    step: step.to_owned(),
                    log: log.map(str::to_owned),
                },
            );
        };
        for (step, lines, duration) in &steps {
            let tick = duration / lines.len().max(1) as u64;
            for line in lines {
                thread::sleep(Duration::from_millis(tick));
                elapsed += tick;
                emit("running", 100.0 * elapsed as f64 / total as f64, step, Some(*line));
            }
        }
        emit("done", 100.0, "Concluído", None);
    });
    id
}
