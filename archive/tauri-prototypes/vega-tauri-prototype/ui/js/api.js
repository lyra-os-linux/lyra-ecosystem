// Ponte com o backend Rust. Fora do Tauri (navegador), usa os mesmos dados de
// demonstração e simula métricas e tarefas, para avaliar o layout sem compilar.

const tauri = window.__TAURI__;
export const native = Boolean(tauri?.core?.invoke);

let fixturesPromise;
function fixtures() {
  fixturesPromise ??= fetch("demo/fixtures.json").then((r) => r.json());
  return fixturesPromise;
}

async function invoke(cmd, args) {
  return tauri.core.invoke(cmd, args);
}

// Leituras reais caem nos dados de demonstração se vierem vazias
// (ex.: sem permissão para ler o journal do sistema).
async function real(cmd, args, fallbackKey) {
  if (native) {
    try {
      const value = await invoke(cmd, args);
      const empty = value == null || (Array.isArray(value) && value.length === 0);
      if (!empty) return value;
    } catch (error) {
      console.warn(cmd, error);
    }
  }
  return (await fixtures())[fallbackKey];
}

// Simulação de métricas para o modo navegador.
const sim = { cpu: 18, mem: 0.41, rx: 0, tx: 0 };
function simMetrics() {
  sim.cpu = Math.min(96, Math.max(3, sim.cpu + (Math.random() - 0.48) * 14));
  sim.mem = Math.min(0.9, Math.max(0.3, sim.mem + (Math.random() - 0.5) * 0.01));
  sim.rx += 20_000 + Math.random() * 380_000;
  sim.tx += 5_000 + Math.random() * 60_000;
  const total = 32_912_072_704;
  return {
    timestamp_ms: Date.now(),
    cpu_percent: sim.cpu,
    mem_total: total,
    mem_used: total * sim.mem,
    swap_total: 17_179_869_184,
    swap_used: 268_435_456,
    load: [1.12, 0.94, 0.88],
    net_rx: sim.rx,
    net_tx: sim.tx,
  };
}

// Tarefas no modo navegador: mesmos nomes de fase do backend, tempos menores.
const previewScripts = {
  update: ["Criando ponto de restauração", "Atualizando repositórios", "Baixando pacotes", "Verificando assinaturas", "Instalando", "Finalizando"],
  nvidia: ["Criando ponto de restauração obrigatório", "Adicionando repositório NVIDIA", "Instalando driver G06", "Verificando módulo assinado pela SUSE", "Finalizando"],
  backup: ["Preparando", "Enviando arquivos", "Verificando"],
  kernel: ["Criando ponto de restauração", "Instalando kernel", "Atualizando bootloader"],
};
const jobListeners = new Set();
let nextJob = 1;

function previewJob(kind, title) {
  const id = nextJob++;
  const steps = previewScripts[kind] ?? ["Executando"];
  const ticks = steps.length * 3;
  let n = 0;
  const timer = setInterval(() => {
    n += 1;
    const step = steps[Math.min(steps.length - 1, Math.floor((n - 1) / 3))];
    const done = n >= ticks;
    const event = { id, kind, title, state: done ? "done" : "running", percent: (100 * n) / ticks, step: done ? "Concluído" : step, log: done ? null : `${step}…` };
    jobListeners.forEach((fn) => fn(event));
    if (done) clearInterval(timer);
  }, 520);
  return id;
}

export const api = {
  overview: () => real("overview", {}, "preview_overview"),
  metrics: () => (native ? invoke("metrics") : Promise.resolve(simMetrics())),
  processes: () => real("processes", {}, "preview_processes"),
  services: () => real("services", {}, "preview_services"),
  journal: (limit, priority) => real("journal", { limit, priority }, "preview_journal"),
  volumes: () => real("volumes", {}, "preview_volumes"),
  prefs: async () => {
    if (native) {
      try { return await invoke("desktop_prefs"); } catch { /* sem gsettings */ }
    }
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return { color_scheme: dark ? "prefer-dark" : "default", accent: "blue" };
  },
  demo: async (domain) => {
    const data = native ? await invoke("demo", { domain }) : (await fixtures())[domain];
    return structuredClone(data);
  },
  startJob: (kind, title) => (native ? invoke("start_job", { kind, title }) : Promise.resolve(previewJob(kind, title))),
  onJob(handler) {
    if (native) tauri.event.listen("vega-job", (e) => handler(e.payload));
    else jobListeners.add(handler);
  },
};

export const win = native ? tauri.window.getCurrentWindow() : null;
