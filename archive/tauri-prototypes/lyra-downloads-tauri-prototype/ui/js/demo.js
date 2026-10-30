// Backend simulado do protótipo. Espelha as operações do IPC real
// (crates/lyra-downloads-ipc: Op, Snapshot, TaskView) para que o layout já
// nasça com o formato de dados do produto. Nada aqui toca a rede ou o disco.

const MiB = 1024 * 1024;
const GiB = 1024 * MiB;
const now = Date.now();
const ago = (min) => new Date(now - min * 60000).toISOString();

let seq = 0;
const id = () => `t${++seq}`;

const settings = {
  default_destination_dir: "/home/lyra/Downloads",
  default_connections: 4,
  max_concurrent_downloads: 2,
  global_speed_limit_bytes: 0,
  auto_resume_on_start: true,
  notifications_enabled: true,
  browser_auto_capture_enabled: false,
};

const task = (o) => ({
  id: id(),
  aria2_gid: null,
  destination_dir: settings.default_destination_dir,
  connections: 4,
  expected_sha256: null,
  pause_reason: null,
  hash_verification: "nao_verificado",
  total_bytes: null,
  downloaded_bytes: 0,
  error_message: null,
  queue_position: 0,
  created_at: ago(5),
  updated_at: ago(1),
  speed: 0,
  active_connections: 0,
  ...o,
});

const tasks = [
  task({ url: "https://download.opensuse.org/distribution/leap/16.1/iso/Leap-16.1-online-installer-x86_64.iso", filename: "Leap-16.1-online-installer-x86_64.iso", state: "baixando", total_bytes: 1.02 * GiB, downloaded_bytes: 0.61 * GiB, connections: 8, aria2_gid: "2089b05ecca3d829", expected_sha256: "9f2c1e4a7b0d6c3e8f5a2b1c4d7e0f3a6b9c2d5e8f1a4b7c0d3e6f9a2b5c8d1e", queue_position: 1, created_at: ago(9) }),
  task({ url: "https://github.com/zed-industries/zed/releases/download/v0.208.4/zed-linux-x86_64.tar.gz", filename: "zed-linux-x86_64.tar.gz", state: "baixando", total_bytes: 148 * MiB, downloaded_bytes: 37 * MiB, connections: 4, aria2_gid: "d1e8f6a2c4b70913", queue_position: 2, created_at: ago(3) }),
  task({ url: "https://releases.ubuntu.com/24.04/ubuntu-24.04.3-desktop-amd64.iso", filename: "ubuntu-24.04.3-desktop-amd64.iso", state: "aguardando", total_bytes: 6.1 * GiB, queue_position: 3, created_at: ago(2) }),
  task({ url: "https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.12.58.tar.xz", filename: "linux-6.12.58.tar.xz", state: "aguardando", total_bytes: 141 * MiB, queue_position: 4, created_at: ago(1) }),
  task({ url: "https://files.example.org/backup/fotos-2026.zip", filename: "fotos-2026.zip", state: "pausado", pause_reason: "usuario", total_bytes: 3.4 * GiB, downloaded_bytes: 1.2 * GiB, queue_position: 5, created_at: ago(55) }),
  task({ url: "https://download.blender.org/release/Blender4.5/blender-4.5.3-linux-x64.tar.xz", filename: "blender-4.5.3-linux-x64.tar.xz", state: "verificando", total_bytes: 352 * MiB, downloaded_bytes: 352 * MiB, expected_sha256: "1c0b5e7f2a4d6c8e0b3f5a7c9e1d3b5f7a9c1e3d5b7f9a1c3e5d7b9f1a3c5e7d", created_at: ago(14) }),
  task({ url: "https://www.gimp.org/downloads/gimp-3.0.6-manual.pdf", filename: "gimp-3.0.6-manual.pdf", state: "concluido", total_bytes: 24 * MiB, downloaded_bytes: 24 * MiB, hash_verification: "confere", expected_sha256: "a3f1c9e5b7d2f4a6c8e0b2d4f6a8c0e2b4d6f8a0c2e4b6d8f0a2c4e6b8d0f2a4", created_at: ago(70), updated_at: ago(62) }),
  task({ url: "https://musica.example.com/podcast/episodio-142.mp3", filename: "episodio-142.mp3", state: "concluido", total_bytes: 88 * MiB, downloaded_bytes: 88 * MiB, created_at: ago(200), updated_at: ago(190) }),
  task({ url: "https://videos.example.com/aula-rust-async.mp4", filename: "aula-rust-async.mp4", state: "concluido", total_bytes: 1.4 * GiB, downloaded_bytes: 1.4 * GiB, created_at: ago(1600), updated_at: ago(1580) }),
  task({ url: "https://mirror.example.net/isos/fedora-43-workstation.iso", filename: "Fedora-Workstation-Live-43.iso", state: "erro", total_bytes: 2.3 * GiB, downloaded_bytes: 0.9 * GiB, error_message: "O servidor respondeu 403 (acesso negado). O link pode ter expirado.", created_at: ago(300), updated_at: ago(280) }),
  task({ url: "https://downloads.example.com/drivers/setup.tar.gz", filename: "setup.tar.gz", state: "erro", total_bytes: 52 * MiB, downloaded_bytes: 52 * MiB, hash_verification: "nao_confere", expected_sha256: "0000aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666777788889999", error_message: "O SHA-256 do arquivo não confere com o informado. O arquivo foi mantido para análise.", created_at: ago(400), updated_at: ago(395) }),
];

const listeners = new Set();
export const engine = { running: true, problem: null, version: "aria2 1.37.0" };
export const history = Array(40).fill(0);

export function onSnapshot(fn) {
  listeners.add(fn);
  fn(snapshot());
  return () => listeners.delete(fn);
}
const emit = () => { const s = snapshot(); listeners.forEach((fn) => fn(s)); };

export function snapshot() {
  const views = tasks.map((t) => ({ ...t }));
  return { tasks: views, total_speed: views.reduce((s, t) => s + (t.speed || 0), 0), engine_running: engine.running, engine_problem: engine.problem };
}

// ---------- Simulação ----------

function promoteQueue() {
  const active = tasks.filter((t) => t.state === "baixando").length;
  const waiting = tasks.filter((t) => t.state === "aguardando").sort((a, b) => a.queue_position - b.queue_position);
  for (let i = 0; i < Math.min(waiting.length, settings.max_concurrent_downloads - active); i++) {
    waiting[i].state = "baixando";
    waiting[i].aria2_gid ??= Math.random().toString(16).slice(2, 18);
  }
}

function tick() {
  if (!engine.running) return;
  const limit = settings.global_speed_limit_bytes;
  for (const t of tasks) {
    if (t.state === "baixando") {
      const base = { 1: 2.2, 4: 6.5, 8: 11, 16: 14 }[t.connections] * MiB;
      t.speed = Math.max(0.3 * MiB, base * (0.75 + Math.random() * 0.5));
      t.active_connections = Math.max(1, Math.min(t.connections, Math.round(t.connections * (0.6 + Math.random() * 0.4))));
      if (t.total_bytes == null && t.downloaded_bytes > 20 * MiB) t.total_bytes = 180 * MiB;
      t.downloaded_bytes += t.speed;
      if (t.total_bytes != null && t.downloaded_bytes >= t.total_bytes) {
        t.downloaded_bytes = t.total_bytes;
        t.speed = 0; t.active_connections = 0;
        t.state = t.expected_sha256 ? "verificando" : "concluido";
        t.updated_at = new Date().toISOString();
        if (t.state === "concluido") notify(t);
      }
    } else if (t.state === "verificando") {
      t.speed = 0;
      t._verify = (t._verify ?? 0) + 1;
      if (t._verify > 4) { t.state = "concluido"; t.hash_verification = "confere"; t.updated_at = new Date().toISOString(); notify(t); }
    } else {
      t.speed = 0; t.active_connections = 0;
    }
  }
  if (limit) {
    const total = tasks.reduce((s, t) => s + t.speed, 0);
    if (total > limit) tasks.forEach((t) => (t.speed *= limit / total));
  }
  promoteQueue();
  history.push(tasks.reduce((s, t) => s + t.speed, 0));
  history.shift();
  emit();
}


let onFinished = () => {};
export const onTaskFinished = (fn) => (onFinished = fn);
const notify = (t) => onFinished(t);

// Aquece o gráfico e a simulação para a janela já abrir em movimento.
history.forEach((_, i) => (history[i] = (14 + Math.sin(i / 3) * 3 + Math.random() * 2) * MiB));
for (let i = 0; i < 3; i++) tick();
setInterval(tick, 1000);

// ---------- Operações (mesmos nomes do enum Op) ----------

const find = (taskId) => tasks.find((t) => t.id === taskId);
const nextPos = () => Math.max(0, ...tasks.map((t) => t.queue_position)) + 1;

export const api = {
  async probe(url) {
    await new Promise((r) => setTimeout(r, 650 + Math.random() * 500));
    const u = new URL(url);
    if (u.hostname.includes("expirado")) throw new Error("O servidor respondeu 404 (não encontrado).");
    const name = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "download");
    const size = name.endsWith(".iso") ? 2.6 * GiB : name.match(/\.(zip|tar\.\w+)$/) ? 310 * MiB : 18 * MiB;
    return { filename: name, total_bytes: Math.random() < 0.15 ? null : size, resumable: Math.random() > 0.1, content_type: "application/octet-stream", host: u.hostname };
  },
  async add({ urls, filename, destination_dir, connections, expected_sha256, start_paused }) {
    const created = [];
    for (const url of urls) {
      const dup = tasks.find((t) => t.url === url && !["concluido", "erro", "cancelado"].includes(t.state));
      if (dup) { created.push({ duplicate: true, filename: dup.filename }); continue; }
      const name = urls.length === 1 && filename ? filename : decodeURIComponent(new URL(url).pathname.split("/").pop() || "download");
      const t = task({ url, filename: name, destination_dir, connections, expected_sha256: expected_sha256 || null, state: start_paused ? "pausado" : "aguardando", pause_reason: start_paused ? "usuario" : null, queue_position: nextPos(), created_at: new Date().toISOString() });
      tasks.unshift(t);
      created.push({ duplicate: false, filename: name, task_id: t.id });
    }
    promoteQueue(); emit();
    return created;
  },
  async pause(taskId) { const t = find(taskId); t.state = "pausado"; t.pause_reason = "usuario"; t.speed = 0; promoteQueue(); emit(); },
  async resume(taskId) { const t = find(taskId); t.state = "aguardando"; t.pause_reason = null; promoteQueue(); emit(); },
  async cancel(taskId) { const t = find(taskId); t.state = "cancelado"; t.speed = 0; promoteQueue(); emit(); },
  async retry(taskId) { const t = find(taskId); t.state = "aguardando"; t.error_message = null; t.hash_verification = "nao_verificado"; promoteQueue(); emit(); },
  async retryWithNewUrl(taskId, url) {
    const old = find(taskId);
    const t = task({ url, filename: old.filename, destination_dir: old.destination_dir, connections: old.connections, expected_sha256: old.expected_sha256, state: "aguardando", queue_position: nextPos(), created_at: new Date().toISOString() });
    tasks.unshift(t); promoteQueue(); emit();
  },
  async removeFromHistory(taskId) { tasks.splice(tasks.findIndex((t) => t.id === taskId), 1); emit(); },
  async deleteFile(taskId) { tasks.splice(tasks.findIndex((t) => t.id === taskId), 1); emit(); },
  async move(taskId, direction) {
    const queue = tasks.filter((t) => ["aguardando", "pausado", "baixando"].includes(t.state)).sort((a, b) => a.queue_position - b.queue_position);
    const i = queue.findIndex((t) => t.id === taskId);
    const j = direction === "top" ? 0 : direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= queue.length) return;
    const [t] = queue.splice(i, 1);
    queue.splice(j, 0, t);
    queue.forEach((q, k) => (q.queue_position = k + 1));
    emit();
  },
  async moveTo(taskId, beforeId) {
    const queue = tasks.filter((t) => ["aguardando", "pausado", "baixando"].includes(t.state)).sort((a, b) => a.queue_position - b.queue_position);
    const [t] = queue.splice(queue.findIndex((q) => q.id === taskId), 1);
    const k = beforeId ? queue.findIndex((q) => q.id === beforeId) : queue.length;
    queue.splice(k < 0 ? queue.length : k, 0, t);
    queue.forEach((q, n) => (q.queue_position = n + 1));
    emit();
  },
  async changeConnections(taskId, connections) { find(taskId).connections = connections; emit(); },
  async pauseAll() { tasks.forEach((t) => { if (["baixando", "aguardando"].includes(t.state)) { t.state = "pausado"; t.pause_reason = "usuario"; t.speed = 0; } }); emit(); },
  async resumeAll() { tasks.forEach((t) => { if (t.state === "pausado") { t.state = "aguardando"; t.pause_reason = null; } }); promoteQueue(); emit(); },
  async getSettings() { return { ...settings }; },
  async setSettings(changes) { Object.assign(settings, changes); promoteQueue(); emit(); },
  async restartEngine() { engine.running = false; engine.problem = null; emit(); await new Promise((r) => setTimeout(r, 1200)); engine.running = true; emit(); },
  async shutdown() { await api.pauseAll(); engine.running = false; engine.problem = "Serviço encerrado. Os downloads continuam pausados até você abrir o Lyra Downloads de novo."; emit(); },
  async openFolder() {},
  async openFile() {},
  /** Só para demonstrar o banner: simula queda do motor. */
  async breakEngine() { engine.running = false; engine.problem = "O aria2 parou de responder (código 1)."; tasks.forEach((t) => { if (t.state === "baixando") { t.state = "pausado"; t.pause_reason = "sistema"; t.speed = 0; } }); emit(); },
};
