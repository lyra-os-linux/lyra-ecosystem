#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Protótipo Tauri do Vega.
//!
//! O backend tem duas fontes de dados:
//! - `system`: leituras reais e sem privilégio (/proc, ps, systemctl,
//!   journalctl, lsblk, gsettings), equivalentes ao que o vegad expõe como
//!   consultas que não exigem polkit;
//! - `demo`: dados simulados para o que, no produto, passa pelo contrato
//!   `org.lyraos.Vega1` (Zypper, Snapper, NVIDIA, firewall...). Trocar `demo`
//!   pelo crate `lyra-vega-dbus` é o caminho para virar produto.

mod demo;
mod jobs;
mod system;

fn main() {
    tauri::Builder::default()
        .manage(system::Sampler::default())
        .manage(jobs::Jobs::default())
        .invoke_handler(tauri::generate_handler![
            system::overview,
            system::metrics,
            system::processes,
            system::services,
            system::journal,
            system::volumes,
            system::desktop_prefs,
            demo::demo,
            jobs::start_job,
        ])
        .run(tauri::generate_context!())
        .expect("falha ao iniciar o Vega");
}
