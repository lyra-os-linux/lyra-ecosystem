//! Dados simulados das áreas que, no produto, passam pelo vegad.
//!
//! O mesmo arquivo alimenta a pré-visualização no navegador, então a interface
//! fica idêntica com e sem o backend.

use std::sync::OnceLock;

use serde_json::Value;

const FIXTURES: &str = include_str!("../../ui/demo/fixtures.json");

fn fixtures() -> &'static Value {
    static PARSED: OnceLock<Value> = OnceLock::new();
    PARSED.get_or_init(|| serde_json::from_str(FIXTURES).expect("fixtures.json inválido"))
}

#[tauri::command]
pub fn demo(domain: String) -> Value {
    fixtures().get(&domain).cloned().unwrap_or(Value::Null)
}
