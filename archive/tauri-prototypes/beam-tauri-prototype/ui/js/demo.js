// Backend simulado do protótipo. Espelha o modelo real do beam-core
// (Profile, Resolution, KnownHosts/TOFU) para que o layout já nasça com o
// formato de dados do produto. Nada aqui abre rede nem toca o chaveiro.

const uid = () => Math.random().toString(16).slice(2, 10);

export const RESOLUTIONS = [[1280, 720], [1366, 768], [1600, 900], [1920, 1080], [2560, 1440]];

const profiles = [
  { id: uid(), name: "Estação do escritório", host: "ws-rodrigo.empresa.local", port: 3389, username: "rodrigo", domain: "EMPRESA", resolution: { width: 1920, height: 1080 }, color_depth: 32, fullscreen: true },
  { id: uid(), name: "Servidor de arquivos", host: "fs01.empresa.local", port: 3389, username: "administrador", domain: "EMPRESA", resolution: { width: 1600, height: 900 }, color_depth: 32, fullscreen: false },
  { id: uid(), name: "Build Windows (CI)", host: "10.20.0.41", port: 3390, username: "ci", domain: null, resolution: { width: 1366, height: 768 }, color_depth: 16, fullscreen: false },
  { id: uid(), name: "Notebook da Ana", host: "ana-notebook", port: 3389, username: "ana", domain: null, resolution: { width: 2560, height: 1440 }, color_depth: 32, fullscreen: true },
  { id: uid(), name: "VM de testes Windows 11", host: "192.168.122.57", port: 3389, username: "teste", domain: null, resolution: { width: 1280, height: 720 }, color_depth: 32, fullscreen: false },
];

const fp = () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join(":").toUpperCase();

// Certificados confiáveis ("known hosts"): host:porta → impressão SHA-256.
const known = new Map([
  ["ws-rodrigo.empresa.local:3389", fp()],
  ["fs01.empresa.local:3389", fp()],
  ["ana-notebook:3389", fp()],
]);
// Na demonstração, o notebook da Ana trocou de certificado desde a última vez.
const changed = new Set(["ana-notebook:3389"]);
// Senhas no chaveiro (só o fato de existir; o protótipo nunca guarda texto).
const keyring = new Set([profiles[0].id]);

export const sessions = new Map(); // profile id → estado da sessão aberta

const key = (p) => `${p.host}:${p.port}`;
const tick = () => Promise.resolve();

const snapshot = () => profiles.map((p) => ({ ...p, saved_password: keyring.has(p.id), session: sessions.get(p.id) ?? null }));
const trustedNow = () => [...known].map(([address, fingerprint]) => ({ address, fingerprint }));
/** Estado inicial síncrono (no produto, viria de um comando Tauri). */
export const initial = () => ({ profiles: snapshot(), trusted: trustedNow() });

export const api = {
  async list() { await tick(); return snapshot(); },
  async save(profile) {
    const i = profiles.findIndex((p) => p.id === profile.id);
    if (i >= 0) profiles[i] = { ...profile }; else profiles.unshift({ ...profile, id: uid() });
  },
  async duplicate(id, suffix) {
    const p = profiles.find((x) => x.id === id);
    const copy = { ...p, id: uid(), name: `${p.name} (${suffix})` };
    profiles.splice(profiles.indexOf(p) + 1, 0, copy);
    return copy;
  },
  async remove(id) { profiles.splice(profiles.findIndex((p) => p.id === id), 1); keyring.delete(id); },
  async forgetPassword(id) { keyring.delete(id); },

  async trusted() { await tick(); return trustedNow(); },
  async untrust(address) { known.delete(address); changed.delete(address); },

  /** Primeira etapa da conexão: o que o servidor apresentou e o que sabemos dele. */
  async probeCertificate(profile) {
    await new Promise((r) => setTimeout(r, 700));
    const k = key(profile);
    if (!known.has(k)) return { status: "first", address: k, fingerprint: fp() };
    if (changed.has(k)) return { status: "changed", address: k, previous: known.get(k), fingerprint: fp() };
    return { status: "trusted", address: k, fingerprint: known.get(k) };
  },
  async trust(address, fingerprint) { known.set(address, fingerprint); changed.delete(address); },
  needsPassword: (profile) => !keyring.has(profile.id),
  async savePassword(id) { keyring.add(id); },
};
