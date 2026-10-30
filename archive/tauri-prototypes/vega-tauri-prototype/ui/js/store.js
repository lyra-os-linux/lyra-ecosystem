// Estado compartilhado: histórico de métricas (o painel e o monitor usam a
// mesma série, então os gráficos não "recomeçam" ao trocar de página) e os
// contadores exibidos na barra lateral.

import { api } from "./api.js";

const HISTORY = 60;
export const metrics = { last: null, cpu: [], mem: [], rx: [], tx: [] };
const metricListeners = new Set();
const badgeListeners = new Set();
export const badges = {};

// Estado da demonstração que muda com as ações do usuário.
export const demoState = { updatesApplied: false, nvidiaInstalled: false, profile: "lyra" };

function push(series, value) {
  series.push(value);
  if (series.length > HISTORY) series.shift();
}

async function sample() {
  if (document.hidden) return;
  try {
    const m = await api.metrics();
    const prev = metrics.last;
    push(metrics.cpu, m.cpu_percent);
    push(metrics.mem, (100 * m.mem_used) / m.mem_total);
    if (prev) {
      const dt = Math.max(0.2, (m.timestamp_ms - prev.timestamp_ms) / 1000);
      push(metrics.rx, Math.max(0, (m.net_rx - prev.net_rx) / dt));
      push(metrics.tx, Math.max(0, (m.net_tx - prev.net_tx) / dt));
    }
    metrics.last = m;
    metricListeners.forEach((fn) => fn(metrics));
  } catch (error) {
    console.warn("metrics", error);
  }
}

export function startSampling() {
  sample();
  setInterval(sample, 1500);
}

export function onMetrics(fn) {
  metricListeners.add(fn);
  if (metrics.last) fn(metrics);
  return () => metricListeners.delete(fn);
}

export function setBadge(page, value) {
  badges[page] = value;
  badgeListeners.forEach((fn) => fn(badges));
}

export function onBadges(fn) {
  badgeListeners.add(fn);
  return () => badgeListeners.delete(fn);
}

// Preferências locais da interface (não do sistema).
const KEY = "vega-prefs";
export const prefs = { theme: "system", accent: "system", density: "comfortable", start: "dashboard" };
try {
  Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) ?? "{}"));
} catch { /* armazenamento indisponível */ }

export function savePrefs() {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch { /* armazenamento indisponível */ }
}
