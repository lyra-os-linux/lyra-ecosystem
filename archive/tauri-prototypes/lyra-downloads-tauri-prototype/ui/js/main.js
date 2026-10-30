// Lyra Downloads — protótipo de layout e UX em Tauri, no padrão do Vega.
// Paridade com crates/lyra-downloads-gtk: filtros, novo download com sondagem,
// fila, conexões, SHA-256, detalhes, preferências e encerramento do serviço.

import { api, engine, history, onSnapshot, onTaskFinished } from "./demo.js";
import { svg, registerIcons } from "./icons.js";
import { t } from "./i18n.js";
import { win } from "./api.js";
import {
  h, icon, clear, bytes, rate, relative, dayLabel, dateTime, normalize, button, iconButton, badge, toggle,
  segmented, list, section, meter, banner, empty, toast, overlay, confirm, sheet, popover, menuItem, fail, busy,
} from "./ui.js";

registerIcons({
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  "list-all": '<path d="M3 6h.01M3 12h.01M3 18h.01M8 6h13M8 12h13M8 18h13"/>',
  hourglass: '<path d="M5 22h14M5 2h14"/><path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22"/><path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
  "to-top": '<path d="M5 3h14"/><path d="m18 13-6-6-6 6"/><path d="M12 7v14"/>',
});

const $ = (id) => document.getElementById(id);

// ---------- Estado da interface ----------

const ACTIVE = ["baixando", "aguardando", "pausado", "verificando"];
const VIEWS = [
  { id: "active", title: "Em andamento", icon: "download", accepts: (s) => ACTIVE.includes(s) },
  { id: "done", title: "Concluídos", icon: "check-circle", accepts: (s) => s === "concluido" },
  { id: "failed", title: "Com erro", icon: "alert", accepts: (s) => s === "erro" },
  { id: "all", title: "Todos", icon: "list-all", accepts: (s) => s !== "cancelado" },
];
const byView = new Map(VIEWS.map((v) => [v.id, v]));

let snap = { tasks: [], total_speed: 0, engine_running: true };
let view = "active";
let selectedId = null;
let filter = "";

const STATE = {
  aguardando: { label: "Na fila", icon: "hourglass", tone: "" },
  baixando: { label: "Baixando", icon: "arrow-down", tone: "accent" },
  pausado: { label: "Pausado", icon: "pause", tone: "" },
  verificando: { label: "Verificando SHA-256", icon: "hash", tone: "" },
  concluido: { label: "Concluído", icon: "check", tone: "green" },
  cancelado: { label: "Cancelado", icon: "x", tone: "" },
  erro: { label: "Erro", icon: "alert", tone: "red" },
};

// ---------- Tema (segue o GNOME; no navegador, o tema do sistema) ----------

function applyTheme() {
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.setProperty("--accent", dark ? "color-mix(in srgb, #3584e4 78%, #fff)" : "#3584e4");
}

// ---------- Formatação ----------

const EXT_COLORS = {
  iso: "#3584e4", img: "#3584e4", zip: "#c64600", "tar.gz": "#c64600", "tar.xz": "#c64600", "tar.zst": "#c64600", "7z": "#c64600", rar: "#c64600",
  pdf: "#e01b24", mp4: "#9141ac", mkv: "#9141ac", webm: "#9141ac", mp3: "#2190a4", flac: "#2190a4", ogg: "#2190a4",
  png: "#26a269", jpg: "#26a269", jpeg: "#26a269", svg: "#26a269", rpm: "#3a944a", deb: "#a51d2d", appimage: "#613583", exe: "#5e5c64",
};
function ext(name) {
  const m = name.toLowerCase().match(/\.(tar\.(?:gz|xz|zst|bz2))$|\.([a-z0-9]{1,8})$/);
  return m ? (m[1] ? `tar.${m[1].split(".")[1]}` : m[2]) : "";
}
function fileTile(task, cls = "") {
  const e = ext(task.filename);
  const label = e.startsWith("tar.") ? "TAR" : e.slice(0, 4) || "—";
  const el = h("span", { class: `ftile st-${task.state} ${cls}`.trim(), style: { "--tile": EXT_COLORS[e] ?? "#77767b" } }, label);
  el.append(icon(STATE[task.state].icon, 14));
  return el;
}
const host = (url) => { try { return new URL(url).hostname; } catch { return url; } };
function eta(task) {
  if (!task.speed || task.total_bytes == null) return null;
  const secs = (task.total_bytes - task.downloaded_bytes) / task.speed;
  if (secs < 60) return t("{n} s", { n: Math.max(1, Math.round(secs)) });
  if (secs < 3600) return t("{n} min", { n: Math.round(secs / 60) });
  return t("{h} h {m} min", { h: Math.floor(secs / 3600), m: Math.round((secs % 3600) / 60) });
}
const fraction = (task) => (task.total_bytes ? task.downloaded_bytes / task.total_bytes : null);

// ---------- Linha de download ----------

function primaryAction(task) {
  switch (task.state) {
    case "baixando":
    case "aguardando":
      return iconButton("pause", t("Pausar"), () => api.pause(task.id).catch(fail));
    case "pausado":
      return iconButton("play", t("Retomar"), () => api.resume(task.id).catch(fail), "go");
    case "erro":
      return [button(t("Novo link…"), { size: "sm", kind: "flat", icon: "link", onClick: (e) => { e.stopPropagation(); newLink(task); } }),
        button(t("Tentar de novo"), { size: "sm", icon: "refresh", onClick: (e) => { e.stopPropagation(); retry(task); } })];
    case "concluido":
      return iconButton("external", t("Abrir arquivo"), () => openFile(task));
    default:
      return null;
  }
}

function statusLine(task) {
  const parts = [];
  const add = (text, cls = "") => parts.push(h("span", { class: `${parts.length ? "dot" : ""} ${cls}`.trim() }, text));
  const total = task.total_bytes;
  switch (task.state) {
    case "baixando":
      add(total ? t("{a} de {b}", { a: bytes(task.downloaded_bytes), b: bytes(total) }) : t("{a} recebidos", { a: bytes(task.downloaded_bytes) }));
      add(rate(task.speed));
      add(eta(task) ? t("{eta} restantes", { eta: eta(task) }) : t("tempo restante desconhecido"));
      add(t("{n} de {m} conexões", { n: task.active_connections, m: task.connections }));
      break;
    case "aguardando":
      add(t("Na fila · posição {n}", { n: queueIndex(task) }));
      if (total) add(bytes(total));
      break;
    case "pausado":
      add(task.pause_reason === "sistema" ? t("Pausado pelo sistema · retoma sozinho") : t("Pausado"));
      add(total ? t("{a} de {b}", { a: bytes(task.downloaded_bytes), b: bytes(total) }) : bytes(task.downloaded_bytes));
      break;
    case "verificando":
      add(t("Conferindo o SHA-256…"));
      add(bytes(total));
      break;
    case "concluido":
      add(bytes(total));
      add(relative(task.updated_at));
      add(host(task.url), "host");
      break;
    case "erro":
      add(task.error_message ?? t("Erro desconhecido"), "err");
      break;
  }
  return h("div", { class: "dl-status" }, parts);
}

function rowBadges(task) {
  const out = [];
  if (task.hash_verification === "confere") out.push(badge(t("SHA-256 confere"), "green", "check"));
  if (task.hash_verification === "nao_confere") out.push(badge(t("SHA-256 não confere"), "red", "alert"));
  if (task.state === "verificando") out.push(badge(t("Verificando"), "accent"));
  return out;
}

function progressBar(task) {
  if (task.state === "concluido" || task.state === "cancelado") return null;
  if (task.state === "aguardando" && !task.downloaded_bytes) return null;
  const f = fraction(task);
  const cls = { pausado: "paused", aguardando: "paused", verificando: "verify indeterminate", erro: "error" }[task.state] ?? "";
  const m = meter(f ?? 0.3, { warnAt: 2, critAt: 2 });
  m.className = `meter ${cls} ${f == null && task.state === "baixando" ? "indeterminate" : ""}`.trim();
  return h("div", { class: "dl-progress" }, m, h("span", { class: "pct" }, task.state === "verificando" ? "SHA-256" : f == null ? "—" : `${Math.floor(f * 100)}%`));
}

function downloadRow(task, { draggable } = {}) {
  const el = h("div", {
    class: `dl-row ${task.id === selectedId ? "selected" : ""}`.trim(),
    tabindex: "0",
    role: "listitem",
    "aria-label": `${task.filename}, ${t(STATE[task.state].label)}`,
    dataset: { id: task.id },
    onclick: () => select(task.id),
    ondblclick: () => (task.state === "concluido" ? openFile(task) : openDetails(task)),
    onkeydown: (e) => rowKeys(e, task),
    oncontextmenu: (e) => { e.preventDefault(); openRowMenu(e.currentTarget.querySelector(".more"), task); },
  });
  const paint = (tk) => {
    clear(
      el,
      draggable && h("span", { class: "drag-handle", title: t("Arraste para reordenar a fila") }, icon("grip", 14)),
      fileTile(tk),
      h("div", { class: "dl-main" }, h("div", { class: "dl-name" }, h("strong", { title: tk.filename }, tk.filename), rowBadges(tk)), statusLine(tk), progressBar(tk)),
      h("div", { class: "dl-actions" },
        primaryAction(tk),
        tk.state === "concluido" && iconButton("folder", t("Abrir pasta"), () => openFolder(tk), "hide-narrow"),
        tk.state === "baixando" || tk.state === "aguardando" || tk.state === "pausado" ? iconButton("x", t("Cancelar"), () => cancel(tk), "hide-narrow") : null,
        h("button", { class: "icon-btn more", "aria-label": t("Mais ações"), title: t("Mais ações"), onclick: (e) => { e.stopPropagation(); openRowMenu(e.currentTarget, tk); } }, icon("more", 17))),
    );
  };
  paint(task);
  el.update = paint;
  if (draggable) dragReorder(el, task);
  return el;
}

function rowKeys(e, task) {
  if (e.key === "Enter") { e.preventDefault(); task.state === "concluido" ? openFile(task) : openDetails(task); }
  else if (e.key === " ") { e.preventDefault(); togglePause(task); }
  else if (e.key === "Delete") { e.preventDefault(); removeFromHistory(task); }
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const rows = [...document.querySelectorAll(".dl-row")];
    const next = rows[rows.indexOf(e.currentTarget) + (e.key === "ArrowDown" ? 1 : -1)];
    next?.focus(); if (next) select(next.dataset.id);
  } else if (e.altKey && (e.key === "PageUp" || e.key === "PageDown")) {
    e.preventDefault(); api.move(task.id, e.key === "PageUp" ? "up" : "down");
  } else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
    e.preventDefault(); openRowMenu(e.currentTarget.querySelector(".more"), task);
  }
}

function select(taskId) {
  selectedId = taskId;
  document.querySelectorAll(".dl-row").forEach((r) => r.classList.toggle("selected", r.dataset.id === taskId));
}

// Arrastar para reordenar a fila (alternativa: menu ou Alt+PgUp/PgDn).
let dragging = null;
function dragReorder(el, task) {
  const handle = el.querySelector(".drag-handle");
  el.draggable = true;
  el.addEventListener("dragstart", (e) => {
    if (!e.target.closest(".dl-row") || !handle) return;
    dragging = task.id; el.classList.add("dragging");
    e.dataTransfer.setData("application/x-lyra-task", task.id);
    e.dataTransfer.effectAllowed = "move";
  });
  el.addEventListener("dragend", () => { dragging = null; el.classList.remove("dragging"); document.querySelectorAll(".drop-before").forEach((r) => r.classList.remove("drop-before")); });
  el.addEventListener("dragover", (e) => { if (!dragging || dragging === task.id) return; e.preventDefault(); document.querySelectorAll(".drop-before").forEach((r) => r.classList.remove("drop-before")); el.classList.add("drop-before"); });
  el.addEventListener("drop", (e) => { if (!dragging) return; e.preventDefault(); e.stopPropagation(); api.moveTo(dragging, task.id); });
}

// ---------- Menu da linha ----------

function openRowMenu(anchor, task) {
  const inQueue = ["aguardando", "pausado", "baixando"].includes(task.state);
  const conn = segmented([1, 4, 8, 16].map((n) => ({ id: n, label: String(n) })), task.connections, (n) => { api.changeConnections(task.id, n).then(() => toast(t("Conexões alteradas. Valem ao retomar o download."))); });
  const close = () => pop.close();
  const pop = popover(anchor, [
    menuItem("info", t("Detalhes"), () => { close(); openDetails(task); }),
    task.state === "concluido" && menuItem("external", t("Abrir arquivo"), () => { close(); openFile(task); }),
    menuItem("folder", t("Abrir pasta"), () => { close(); openFolder(task); }),
    menuItem("copy", t("Copiar endereço"), () => { close(); navigator.clipboard?.writeText(task.url); toast(t("Endereço copiado.")); }),
    (task.state === "erro" || task.state === "pausado") && menuItem("link", t("Tentar com um novo link…"), () => { close(); newLink(task); }),
    inQueue && h("hr"),
    inQueue && menuItem("to-top", t("Mover para o início da fila"), () => { close(); api.move(task.id, "top"); }),
    inQueue && menuItem("arrow-up", t("Subir na fila"), () => { close(); api.move(task.id, "up"); }, "Alt PgUp"),
    inQueue && menuItem("arrow-down", t("Descer na fila"), () => { close(); api.move(task.id, "down"); }, "Alt PgDn"),
    inQueue && h("div", { class: "menu-conn" }, h("span", { class: "small muted" }, t("Conexões (máximo)")), conn),
    h("hr"),
    menuItem("trash", t("Remover do histórico"), () => { close(); removeFromHistory(task); }, "Del"),
    (task.state === "concluido" || task.state === "erro" || task.state === "pausado") && menuItem("trash", t("Apagar arquivo do disco…"), () => { close(); deleteFile(task); }),
  ].filter(Boolean), "menu");
}

// ---------- Ações ----------

const togglePause = (task) => (task.state === "pausado" ? api.resume(task.id) : ["baixando", "aguardando"].includes(task.state) ? api.pause(task.id) : null);
const openFile = (task) => api.openFile(task.id).then(() => toast(t("Abrindo {name}…", { name: task.filename }), { ic: "external" }));
const openFolder = (task) => api.openFolder(task.id).then(() => toast(t("Abrindo a pasta {dir}…", { dir: task.destination_dir }), { ic: "folder" }));

async function cancel(task) {
  const ok = await confirm({ title: t("Cancelar o download?"), text: task.filename, ic: "x", tone: "red", confirmLabel: t("Cancelar download"), confirmKind: "danger",
    facts: [{ icon: "trash", text: t("O arquivo parcial é apagado. Para continuar depois, use Pausar."), warn: true }] });
  if (ok) api.cancel(task.id).then(() => toast(t("Download cancelado.")));
}

function retry(task) {
  api.retry(task.id).then(() => toast(t("Tentando de novo: {name}", { name: task.filename }), { ic: "refresh" }));
}

function removeFromHistory(task) {
  api.removeFromHistory(task.id).then(() => toast(t("Removido do histórico. O arquivo continua no disco."), { action: t("Desfazer"), onAction: () => toast(t("Protótipo: desfazer ainda não simulado.")) }));
}

async function deleteFile(task) {
  const ok = await confirm({ title: t("Apagar o arquivo do disco?"), text: `${task.destination_dir}/${task.filename}`, ic: "trash", tone: "red", confirmLabel: t("Apagar arquivo"), confirmKind: "danger",
    facts: [{ icon: "alert", text: t("O arquivo vai para a lixeira? Não: ele é apagado de vez."), warn: true }, { icon: "check", text: t("O download também sai do histórico.") }] });
  if (ok) api.deleteFile(task.id).then(() => toast(t("Arquivo apagado.")));
}

function newLink(task) {
  const input = h("input", { class: "input", placeholder: "https://…", "aria-label": t("Novo endereço"), style: { width: "100%" } });
  const err = h("p", { class: "hint err" });
  const close = sheet(t("Tentar com um novo link"), [
    h("p", { class: "muted", style: { "margin-bottom": "14px" } }, t("Um novo download é criado com o mesmo nome, pasta, conexões e SHA-256. O arquivo parcial do link anterior não é reaproveitado, porque não dá para garantir que o conteúdo é o mesmo.")),
    h("div", { class: "field" }, h("label", {}, t("Endereço")), input, err),
    h("div", { class: "sheet-actions" }, button(t("Cancelar"), { onClick: () => close() }), button(t("Criar download"), { kind: "primary", onClick: () => {
      if (!/^https?:\/\/\S+$/.test(input.value.trim())) { err.textContent = t("Use um endereço http:// ou https://."); return; }
      api.retryWithNewUrl(task.id, input.value.trim()).then(() => { close(); toast(t("Novo download criado.")); });
    } })),
  ], { wide: false });
  requestAnimationFrame(() => input.focus());
}

// ---------- Novo download ----------

function parseUrls(text) {
  return [...new Set(text.split(/\s+/).map((s) => s.trim()).filter(Boolean))];
}
const validUrl = (s) => /^https?:\/\/[^\s/$.?#].\S*$/i.test(s);

async function openNewDownload(prefill = "") {
  const prefs = await api.getSettings();
  const urls = h("textarea", { class: "input", rows: "2", placeholder: t("https://… (um endereço por linha para vários)"), "aria-label": t("Endereço"), spellcheck: "false" });
  urls.value = prefill;
  const urlHint = h("p", { class: "hint" }, t("Dica: cole com Ctrl+V em qualquer lugar da janela, ou arraste um link para cá."));
  const probeBox = h("div");
  const name = h("input", { class: "input", "aria-label": t("Nome do arquivo") });
  const nameField = h("div", { class: "field" }, h("label", {}, t("Nome do arquivo")), name);
  const folder = h("input", { class: "input mono", value: prefs.default_destination_dir, "aria-label": t("Pasta") });
  const sha = h("input", { class: "input mono", placeholder: t("Opcional"), "aria-label": t("SHA-256 esperado"), spellcheck: "false" });
  const shaHint = h("p", { class: "hint" }, t("Confere os bytes baixados. Não prova sozinho que o arquivo é autêntico."));
  let connections = prefs.default_connections;
  const conn = segmented([1, 4, 8, 16].map((n) => ({ id: n, label: String(n) })), connections, (n) => (connections = n));
  let notify = prefs.notifications_enabled;
  let paused = false;

  const advanced = h("div", { class: "form-grid", hidden: true },
    h("div", { class: "field full" }, h("label", {}, t("SHA-256 esperado")), sha, shaHint),
    h("div", { class: "field" }, h("span", { class: "label" }, t("Conexões por download")), conn, h("p", { class: "hint" }, t("Máximo pedido ao servidor; ele pode aceitar menos."))),
    h("div", { class: "field" }, h("span", { class: "label" }, t("Ao adicionar")),
      h("label", { class: "row-flex small" }, toggle(notify, (v) => (notify = v), t("Avisar ao concluir")), t("Avisar ao concluir")),
      h("label", { class: "row-flex small" }, toggle(false, (v) => (paused = v), t("Adicionar pausado")), t("Adicionar pausado"))),
  );
  const moreBtn = h("button", { class: "more-toggle", "aria-expanded": "false", onclick: () => {
    const open = moreBtn.getAttribute("aria-expanded") !== "true";
    moreBtn.setAttribute("aria-expanded", String(open)); advanced.hidden = !open;
  } }, icon("chevron-right", 15), t("Mais opções: SHA-256, conexões, aviso"));

  const startBtn = button(t("Baixar"), { kind: "primary", icon: "download" });
  const counter = h("span");

  let probeSeq = 0;
  let lastProbe = null;
  const refresh = async () => {
    const list = parseUrls(urls.value);
    const bad = list.filter((u) => !validUrl(u));
    urlHint.className = `hint ${bad.length ? "err" : ""}`;
    urlHint.textContent = bad.length ? t("Endereço inválido: {u}. Use http:// ou https://.", { u: bad[0] }) : list.length > 1 ? t("{n} endereços. Todos usam a mesma pasta e as mesmas opções.", { n: list.length }) : t("Dica: cole com Ctrl+V em qualquer lugar da janela, ou arraste um link para cá.");
    nameField.hidden = list.length > 1;
    startBtn.disabled = !list.length || bad.length > 0;
    clear(startBtn, icon("download", 16), list.length > 1 ? t("Baixar {n} arquivos", { n: list.length }) : t("Baixar"));
    clear(counter);
    if (list.length !== 1 || bad.length) {
      clear(probeBox, list.length > 1 && h("div", { class: "probe multi" }, h("span", { class: "lead" }, icon("layers", 20)), h("div", { class: "meta" }, h("strong", {}, t("Vários links")), h("span", {}, t("Cada endereço vira um download na fila.")))));
      return;
    }
    if (lastProbe === list[0]) return;
    lastProbe = list[0];
    const mine = ++probeSeq;
    clear(probeBox, h("div", { class: "probe loading" }, h("span", { class: "spinner" }), t("Consultando o servidor…")));
    try {
      const info = await api.probe(list[0]);
      if (mine !== probeSeq) return;
      if (!name.dataset.touched) name.value = info.filename;
      clear(probeBox, h("div", { class: "probe" },
        fileTile({ filename: info.filename, state: "aguardando" }),
        h("div", { class: "meta" }, h("strong", {}, info.filename), h("span", {}, [info.total_bytes ? bytes(info.total_bytes) : t("tamanho desconhecido"), info.host].join(" · "))),
        info.resumable ? badge(t("Retomável"), "green", "check") : badge(t("Sem retomada"), "yellow", "alert")));
    } catch (error) {
      if (mine !== probeSeq) return;
      clear(probeBox, banner("warn", "alert", t("Não foi possível consultar o servidor"), `${error.message} ${t("Você ainda pode adicionar o download.")}`));
    }
  };
  let debounce;
  urls.addEventListener("input", () => { clearTimeout(debounce); debounce = setTimeout(refresh, 350); });
  name.addEventListener("input", () => (name.dataset.touched = "1"));
  sha.addEventListener("input", () => {
    const v = sha.value.trim();
    const ok = !v || /^[0-9a-f]{64}$/i.test(v);
    shaHint.className = `hint ${ok ? (v ? "ok" : "") : "err"}`;
    shaHint.textContent = !v ? t("Confere os bytes baixados. Não prova sozinho que o arquivo é autêntico.") : ok ? t("Formato válido.") : t("O SHA-256 tem 64 caracteres hexadecimais.");
    startBtn.disabled = !ok;
  });

  startBtn.addEventListener("click", () => busy(startBtn, async () => {
    const list = parseUrls(urls.value);
    const res = await api.add({ urls: list, filename: name.value.trim(), destination_dir: folder.value.trim(), connections, expected_sha256: sha.value.trim(), start_paused: paused, notify });
    close();
    const dup = res.filter((r) => r.duplicate).length;
    const added = res.length - dup;
    toast(dup ? t("{a} adicionado(s); {d} já estava(m) na fila.", { a: added, d: dup }) : added > 1 ? t("{n} downloads adicionados.", { n: added }) : t("Baixando {name}.", { name: res[0].filename }), { ic: "download" });
    navigate("active");
  }));

  const close = sheet(t("Novo download"), [
    h("div", { class: "form-grid" },
      h("div", { class: "field full" }, h("label", {}, t("Endereço")), urls, urlHint),
      h("div", { class: "full" }, probeBox),
      h("div", { class: "field full" }, nameField),
      h("div", { class: "field full" }, h("label", {}, t("Pasta")), h("div", { class: "folder-pick" }, folder, button(t("Escolher…"), { icon: "folder", onClick: () => toast(t("Protótipo: aqui abre o seletor de pastas do GNOME (portal).")) })))),
    h("div", { style: { "margin-top": "14px" } }, moreBtn),
    advanced,
    h("div", { class: "sheet-actions" }, h("div", { class: "left" }, counter), button(t("Cancelar"), { onClick: () => close() }), startBtn),
  ]);
  urls.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || !urls.value.includes("\n")) && !startBtn.disabled) { e.preventDefault(); startBtn.click(); } });
  refresh();
  requestAnimationFrame(() => urls.focus());
}

// ---------- Detalhes ----------

function openDetails(task) {
  const kv = (rows) => h("dl", { class: "kv wide" }, rows.filter(Boolean).map(([k, v]) => [h("dt", {}, k), h("dd", { class: "selectable" }, v)]));
  const f = fraction(task);
  const shaState = { confere: [t("Confere"), "green"], nao_confere: [t("Não confere"), "red"], nao_verificado: [t("Não verificado"), ""] }[task.hash_verification];
  const close = sheet(t("Detalhes do download"), [
    h("div", { class: "details-head" }, fileTile(task), h("div", {}, h("h3", { class: "selectable" }, task.filename), h("p", {}, t(STATE[task.state].label), task.state === "baixando" ? ` · ${rate(task.speed)}` : ""))),
    task.state !== "concluido" && f != null && h("div", { style: { "margin-bottom": "18px" } }, meter(f, { warnAt: 2, critAt: 2, lg: true })),
    task.error_message && h("div", { style: { "margin-bottom": "16px" } }, banner("danger", "alert-circle", t("Erro"), task.error_message)),
    kv([
      [t("Endereço"), h("span", { class: "mono" }, task.url)],
      [t("Arquivo"), h("span", { class: "mono" }, `${task.destination_dir}/${task.filename}`)],
      [t("Recebido"), task.total_bytes ? t("{a} de {b}", { a: bytes(task.downloaded_bytes), b: bytes(task.total_bytes) }) : bytes(task.downloaded_bytes)],
      [t("Conexões"), t("{a} ativas · {r} pedidas (máximo)", { a: task.active_connections, r: task.connections })],
      [t("SHA-256 esperado"), task.expected_sha256 ? h("span", { class: "hash" }, task.expected_sha256) : t("Não informado")],
      [t("Verificação"), badge(shaState[0], shaState[1])],
      [t("Criado em"), dateTime(task.created_at)],
      [t("Atualizado em"), dateTime(task.updated_at)],
      task.aria2_gid && [t("GID do aria2"), h("span", { class: "mono" }, task.aria2_gid)],
    ]),
    h("div", { class: "sheet-actions" },
      button(t("Copiar endereço"), { icon: "copy", onClick: () => { navigator.clipboard?.writeText(task.url); toast(t("Endereço copiado.")); } }),
      button(t("Abrir pasta"), { icon: "folder", onClick: () => openFolder(task) }),
      task.state === "concluido" && button(t("Abrir arquivo"), { kind: "primary", icon: "external", onClick: () => { close(); openFile(task); } }),
      task.state === "erro" && button(t("Tentar novamente"), { kind: "primary", icon: "refresh", onClick: () => { close(); retry(task); } })),
  ]);
}

// ---------- Preferências ----------

async function openPreferences() {
  const s = await api.getSettings();
  const save = (c) => api.setSettings(c).catch(fail);
  const num = (value, min, max, key, suffix, label) => {
    const el = h("input", { class: "input", type: "number", min, max, value: String(value), "aria-label": label, style: { width: "92px" } });
    el.addEventListener("change", () => { const v = Math.min(max, Math.max(min, Math.round(Number(el.value) || 0))); el.value = String(v); save({ [key]: suffix ? v * 1024 * 1024 : v }); });
    return h("span", { class: "row-flex" }, el, suffix && h("span", { class: "small muted" }, suffix));
  };
  const sw = (key, label) => toggle(s[key], (v) => save({ [key]: v }), label);
  const row = (title, subtitle, suffix) => h("div", { class: "list-row" }, h("div", { class: "body" }, h("div", { class: "title" }, title), subtitle && h("div", { class: "subtitle wrap" }, subtitle)), h("div", { class: "suffix" }, suffix));
  const folder = h("span", { class: "mono small" }, s.default_destination_dir);
  sheet(t("Preferências"), [
    h("div", { class: "pref-group" }, h("h4", {}, t("Downloads")), list(
      row(t("Pasta padrão"), folder, button(t("Escolher…"), { size: "sm", icon: "folder", onClick: () => toast(t("Protótipo: seletor de pastas do GNOME.")) })),
      row(t("Conexões por download"), t("Padrão para novos downloads. É um máximo, não uma garantia."), segmented([1, 4, 8, 16].map((n) => ({ id: n, label: String(n) })), s.default_connections, (n) => save({ default_connections: n }))),
      row(t("Downloads ao mesmo tempo"), t("Os demais esperam na fila."), num(s.max_concurrent_downloads, 1, 10, "max_concurrent_downloads", "", t("Downloads ao mesmo tempo"))),
      row(t("Limite de velocidade"), t("0 = sem limite. Vale para todos os downloads juntos."), num(Math.round(s.global_speed_limit_bytes / 1048576), 0, 10000, "global_speed_limit_bytes", "MiB/s", t("Limite de velocidade"))),
    )),
    h("div", { class: "pref-group" }, h("h4", {}, t("Comportamento")), list(
      row(t("Retomar sozinho"), t("Retoma os downloads que o sistema pausou (queda do motor ou reinício). Os que você pausou continuam pausados."), sw("auto_resume_on_start", t("Retomar sozinho"))),
      row(t("Avisar ao concluir"), null, sw("notifications_enabled", t("Avisar ao concluir"))),
    )),
    h("div", { class: "pref-group" }, h("h4", {}, t("Firefox")), list(
      row(t("Capturar downloads do Firefox"), t("Envia ao Lyra Downloads todo download iniciado no Firefox. Desligado, só o item “Baixar com o Lyra Downloads” do menu do link é usado."), sw("browser_auto_capture_enabled", t("Capturar downloads do Firefox"))),
    )),
    h("div", { class: "pref-group" }, h("h4", {}, t("Serviço")), list(
      row(t("Motor de download"), engine.running ? t("{v} em execução", { v: engine.version }) : t("Parado"), button(t("Reiniciar"), { size: "sm", icon: "refresh", onClick: (e) => busy(e.currentTarget, () => api.restartEngine()).then(() => toast(t("Motor reiniciado."))) })),
    )),
  ], { wide: false });
}

// ---------- Busca (downloads e ações) ----------

function openPalette(initial = "") {
  const input = h("input", { placeholder: t("Buscar downloads ou ações…"), "aria-label": t("Buscar"), role: "combobox", "aria-expanded": "true", "aria-controls": "palette-list" });
  input.value = initial;
  const listEl = h("div", { class: "palette-list", id: "palette-list", role: "listbox" });
  const actions = [
    { icon: "plus", label: t("Novo download"), hint: "Ctrl N", run: () => openNewDownload() },
    { icon: "pause", label: t("Pausar tudo"), run: () => api.pauseAll() },
    { icon: "play", label: t("Retomar tudo"), run: () => api.resumeAll() },
    { icon: "cog", label: t("Preferências"), hint: "Ctrl ,", run: openPreferences },
    ...VIEWS.map((v) => ({ icon: v.icon, label: t(v.title), run: () => navigate(v.id) })),
  ];
  let results = []; let selected = 0;
  const render = () => {
    const q = normalize(input.value.trim());
    const tasks = snap.tasks.filter((tk) => tk.state !== "cancelado" && (!q || normalize(tk.filename).includes(q) || normalize(tk.url).includes(q))).slice(0, 8)
      .map((tk) => ({ section: t("Downloads"), lead: fileTile(tk), label: tk.filename, where: t(STATE[tk.state].label), run: () => { navigate(viewFor(tk)); requestAnimationFrame(() => { select(tk.id); document.querySelector(`.dl-row[data-id="${tk.id}"]`)?.focus(); }); } }));
    const acts = actions.filter((a) => !q || normalize(a.label).includes(q)).map((a) => ({ ...a, section: t("Ações") }));
    results = [...tasks, ...acts];
    selected = Math.min(selected, Math.max(0, results.length - 1));
    let last = null;
    clear(listEl, results.length === 0 ? h("div", { class: "empty", style: { padding: "30px" } }, h("p", {}, t("Nada encontrado para “{q}”", { q: input.value })))
      : results.map((r, i) => {
        const head = r.section !== last && h("div", { class: "palette-section" }, r.section); last = r.section;
        return [head, h("button", { class: "palette-item", role: "option", "aria-selected": String(i === selected), onclick: () => choose(i) }, r.lead ?? icon(r.icon, 17), h("span", {}, r.label), r.where && h("span", { class: "where" }, r.where), r.hint && h("kbd", {}, r.hint))];
      }));
  };
  const choose = (i) => { const r = results[i]; if (!r) return; close(); r.run(); };
  input.addEventListener("input", () => { selected = 0; render(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); selected = Math.min(results.length - 1, selected + 1); render(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); selected = Math.max(0, selected - 1); render(); }
    else if (e.key === "Enter") { e.preventDefault(); choose(selected); }
  });
  const close = overlay(h("div", { class: "palette", role: "dialog", "aria-label": t("Buscar") },
    h("div", { class: "palette-input" }, icon("search", 19), input, h("kbd", {}, "Esc")), listEl,
    h("div", { class: "palette-foot" }, h("span", {}, h("kbd", {}, "↑↓"), " ", t("navegar")), h("span", {}, h("kbd", {}, "Enter"), " ", t("abrir")))), { top: true });
  render();
  requestAnimationFrame(() => input.focus());
}
const viewFor = (tk) => (ACTIVE.includes(tk.state) ? "active" : tk.state === "concluido" ? "done" : tk.state === "erro" ? "failed" : "all");

// ---------- Páginas ----------

const queueOrder = () => snap.tasks.filter((tk) => ["baixando", "aguardando", "pausado"].includes(tk.state)).sort((a, b) => a.queue_position - b.queue_position);
const queueIndex = (task) => snap.tasks.filter((tk) => tk.state === "aguardando").sort((a, b) => a.queue_position - b.queue_position).findIndex((tk) => tk.id === task.id) + 1;
const matches = (tk) => !filter || normalize(tk.filename).includes(normalize(filter));

function rowsList(tasks, opts) {
  return h("div", { class: "list", role: "list" }, tasks.map((tk) => downloadRow(tk, opts)));
}

function engineBanner() {
  if (snap.engine_running) return null;
  return h("div", { style: { "margin-bottom": "18px" } }, banner("danger", "alert-circle", t("O motor de download parou"), snap.engine_problem ?? t("Os downloads estão pausados."),
    button(t("Reiniciar motor"), { onClick: (e) => busy(e.currentTarget, () => api.restartEngine()).then(() => toast(t("Motor reiniciado. Os downloads pausados pelo sistema retomam sozinhos.")) ) })));
}

function emptyFor(v) {
  const add = button(t("Novo download"), { kind: "primary pill", icon: "plus", onClick: () => openNewDownload() });
  switch (v) {
    case "active": return empty("download", t("Nada em andamento"), t("Cole um link com Ctrl+V, arraste um link para a janela ou use “Baixar com o Lyra Downloads” no menu de um link do Firefox. Fechar a janela não interrompe os downloads."), add);
    case "done": return empty("check-circle", t("Nenhum download concluído"), t("Os arquivos baixados aparecem aqui, agrupados por dia."), null, "green");
    case "failed": return empty("check-circle", t("Nenhum erro"), t("Downloads que falharem aparecem aqui, com a opção de tentar de novo."), null, "green");
    default: return empty("download", t("Nenhum download"), t("Cole um link com Ctrl+V ou arraste um link para a janela."), add);
  }
}

function summary() {
  const downloading = snap.tasks.filter((tk) => tk.state === "baixando");
  const queued = snap.tasks.filter((tk) => tk.state === "aguardando").length;
  // Termina quando o download ativo mais demorado terminar.
  const secs = Math.max(0, ...downloading.filter((tk) => tk.speed && tk.total_bytes).map((tk) => (tk.total_bytes - tk.downloaded_bytes) / tk.speed));
  const remaining = secs;
  const fmt = secs < 60 ? t("{n} s", { n: Math.round(secs) }) : secs < 3600 ? t("{n} min", { n: Math.round(secs / 60) }) : t("{h} h {m} min", { h: Math.floor(secs / 3600), m: Math.round((secs % 3600) / 60) });
  return h("div", { class: "dl-summary" },
    h("span", {}, h("b", {}, String(downloading.length)), " ", t("baixando")),
    h("span", { class: "sep" }), h("span", {}, h("b", {}, String(queued)), " ", t("na fila")),
    h("span", { class: "sep" }), h("span", {}, h("b", {}, rate(snap.total_speed))),
    downloading.length > 0 && remaining > 0 && [h("span", { class: "sep" }), h("span", {}, t("termina em cerca de"), " ", h("b", {}, fmt))]);
}

function renderPage() {
  const tasks = snap.tasks.filter((tk) => byView.get(view).accepts(tk.state) && matches(tk));
  const page = $("page");
  let content;
  if (view === "active") {
    const q = queueOrder().filter(matches);
    const downloading = q.filter((tk) => tk.state === "baixando");
    const verifying = snap.tasks.filter((tk) => tk.state === "verificando" && matches(tk));
    const waiting = q.filter((tk) => tk.state === "aguardando");
    const paused = q.filter((tk) => tk.state === "pausado");
    content = tasks.length === 0 ? [engineBanner(), emptyFor(view)] : [
      engineBanner(),
      summary(),
      (downloading.length || verifying.length) && section(t("Baixando"), {}, rowsList([...downloading, ...verifying])),
      waiting.length > 0 && section(t("Na fila"), { sub: t("arraste para reordenar"), actions: [button(t("Pausar fila"), { size: "sm", kind: "flat", icon: "pause", onClick: () => api.pauseAll() })] }, rowsList(waiting, { draggable: true })),
      paused.length > 0 && section(t("Pausados"), { actions: [button(t("Retomar todos"), { size: "sm", kind: "flat", icon: "play", onClick: () => api.resumeAll() })] }, rowsList(paused)),
    ];
  } else if (view === "done") {
    const groups = new Map();
    for (const tk of [...tasks].sort((a, b) => b.updated_at.localeCompare(a.updated_at))) {
      const day = dayLabel(tk.updated_at);
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(tk);
    }
    content = tasks.length === 0 ? emptyFor(view) : [...groups].map(([day, items]) => section(day, { sub: t("{n} arquivo(s)", { n: items.length }) }, rowsList(items)));
  } else if (view === "failed") {
    content = tasks.length === 0 ? emptyFor(view) : [
      h("div", { class: "dl-summary" }, t("Tente de novo ou use um link novo quando o anterior expirou. O arquivo parcial é mantido.")),
      rowsList(tasks),
      tasks.length > 1 && h("div", { class: "row-flex", style: { "margin-top": "14px", "justify-content": "flex-end" } }, button(t("Tentar todos de novo"), { icon: "refresh", onClick: () => tasks.forEach((tk) => api.retry(tk.id)) })),
    ];
  } else {
    const order = (tk) => ({ baixando: 0, verificando: 1, aguardando: 2, pausado: 3, erro: 4, concluido: 5 }[tk.state] ?? 6);
    content = tasks.length === 0 ? emptyFor(view) : [engineBanner(), rowsList([...tasks].sort((a, b) => order(a) - order(b) || (order(a) <= 3 ? a.queue_position - b.queue_position : b.updated_at.localeCompare(a.updated_at))))];
  }
  const focusedId = document.activeElement?.closest?.(".dl-row")?.dataset.id;
  clear(page, content);
  if (focusedId) document.querySelector(`.dl-row[data-id="${focusedId}"]`)?.focus();
}

// Atualização ao vivo: se as linhas são as mesmas, só repinta cada uma (não
// perde foco, popover aberto nem posição de rolagem).
let lastKey = "";
function update() {
  renderNav();
  renderEngine();
  const ids = snap.tasks.filter((tk) => byView.get(view).accepts(tk.state) && matches(tk)).map((tk) => `${tk.id}:${tk.state}:${tk.queue_position}`).join("|") + `|${snap.engine_running}`;
  if (ids !== lastKey || document.querySelector(".dl-row.dragging")) {
    if (!document.querySelector(".dl-row.dragging")) { lastKey = ids; renderPage(); }
    return;
  }
  const byId = new Map(snap.tasks.map((tk) => [tk.id, tk]));
  document.querySelectorAll(".dl-row").forEach((row) => { const tk = byId.get(row.dataset.id); if (tk) row.update(tk); });
  const sum = document.querySelector(".dl-summary");
  if (sum && view === "active" && snap.tasks.some((tk) => tk.state === "baixando")) sum.replaceWith(summary());
  setCrumb();
}

// ---------- Moldura: navegação, motor, cabeçalho ----------

function counts() {
  const c = {};
  for (const v of VIEWS) c[v.id] = snap.tasks.filter((tk) => v.accepts(tk.state)).length;
  return c;
}

function renderNav() {
  const c = counts();
  clear($("nav"), h("div", { class: "nav-group" }, VIEWS.map((v) =>
    h("button", { class: "nav-item", "aria-current": v.id === view ? "page" : null, onclick: () => navigate(v.id) },
      icon(v.icon, 18), h("span", {}, t(v.title)),
      c[v.id] > 0 && v.id !== "all" ? h("span", { class: `count ${v.id === "failed" ? "warn" : v.id === "done" ? "muted-count" : ""}`.trim() }, String(c[v.id])) : null))));
}

function renderEngine() {
  $("engine-rate").textContent = rate(snap.total_speed);
  const dot = $("engine-dot");
  dot.className = `status-dot ${snap.engine_running ? "" : "bad"}`.trim();
  $("engine-label").textContent = snap.engine_running ? t("{v} · ativo", { v: engine.version }) : t("Motor parado");
  const max = Math.max(1, ...history);
  const pts = history.map((v, i) => `${(i / (history.length - 1)) * 120},${26 - (v / max) * 22}`);
  $("engine-spark").querySelector(".line").setAttribute("d", `M${pts.join(" L")}`);
  $("engine-spark").querySelector(".area").setAttribute("d", `M0,26 L${pts.join(" L")} L120,26 Z`);
}

function setCrumb() {
  const c = counts();
  const text = view === "active" ? (snap.total_speed ? `${rate(snap.total_speed)}` : t("{n} na lista", { n: c.active })) : t("{n} itens", { n: c[view] });
  $("page-crumb").textContent = text;
}

function headerActions() {
  const search = h("input", { class: "input", placeholder: t("Filtrar por nome"), "aria-label": t("Filtrar por nome") });
  search.value = filter;
  search.addEventListener("input", () => { filter = search.value; lastKey = ""; update(); });
  const pauseAll = iconButton("pause", t("Pausar tudo"), () => api.pauseAll().then(() => toast(t("Tudo pausado."), { action: t("Retomar"), onAction: () => api.resumeAll() })));
  return [
    h("div", { class: "input-icon header-filter" }, icon("filter", 15), search),
    pauseAll,
    button(t("Novo download"), { kind: "primary", icon: "plus", onClick: () => openNewDownload(), title: "Ctrl N" }),
    h("span", { class: "header-sep" }),
  ];
}

function navigate(id) {
  if (!byView.has(id)) id = "active";
  view = id;
  if (location.hash !== `#/${id}`) history_replace(id);
  $("page-title").textContent = t(byView.get(id).title);
  document.title = `${t(byView.get(id).title)} — Downloads`;
  lastKey = "";
  update();
  $("scroller").scrollTop = 0;
  $("page").classList.remove("enter"); void $("page").offsetWidth; $("page").classList.add("enter");
}
const history_replace = (id) => window.history.replaceState(null, "", `#/${id}`);

function openMainMenu(anchor) {
  const pop = popover(anchor, [
    menuItem("plus", t("Novo download"), () => { pop.close(); openNewDownload(); }, "Ctrl N"),
    menuItem("play", t("Retomar tudo"), () => { pop.close(); api.resumeAll(); }),
    h("hr"),
    menuItem("cog", t("Preferências"), () => { pop.close(); openPreferences(); }, "Ctrl ,"),
    menuItem("keyboard", t("Atalhos de teclado"), () => { pop.close(); openShortcuts(); }, "Ctrl ?"),
    menuItem("star", t("Sobre o Lyra Downloads"), () => { pop.close(); openAbout(); }),
    h("hr"),
    menuItem("power", t("Pausar tudo e encerrar o serviço…"), () => { pop.close(); quitService(); }),
    menuItem("alert", t("Simular queda do motor (protótipo)"), () => { pop.close(); api.breakEngine(); }),
  ], "menu");
}

async function quitService() {
  const ok = await confirm({ title: t("Pausar tudo e encerrar?"), text: t("O serviço em segundo plano para. Os downloads ficam pausados e continuam quando você abrir o Lyra Downloads de novo."), ic: "power", confirmLabel: t("Pausar e encerrar"),
    facts: [{ icon: "check", text: t("Nenhum arquivo parcial é perdido.") }, { icon: "info", text: t("Fechar só a janela não interrompe os downloads.") }] });
  if (ok) api.shutdown().then(() => toast(t("Serviço encerrado.")));
}

function openShortcuts() {
  const rows = [[t("Novo download"), "Ctrl N"], [t("Colar link e baixar"), "Ctrl V"], [t("Buscar"), "Ctrl K"], [t("Preferências"), "Ctrl ,"],
    [t("Pausar ou retomar o selecionado"), "Espaço"], [t("Abrir arquivo ou detalhes"), "Enter"], [t("Remover do histórico"), "Del"],
    [t("Subir ou descer na fila"), "Alt PgUp/PgDn"], [t("Ir para a lista 1–4"), "Alt 1…4"], [t("Fechar diálogo"), "Esc"]];
  sheet(t("Atalhos de teclado"), list(rows.map(([label, keys]) => h("div", { class: "list-row" }, h("div", { class: "body" }, label), h("div", { class: "suffix" }, keys.split(" ").map((k) => h("kbd", {}, k)))))), { wide: false });
}

function openAbout() {
  sheet(t("Sobre o Lyra Downloads"), [
    h("div", { style: { "text-align": "center", padding: "6px 0 4px" } },
      h("div", { class: "brand-mark", style: { width: "72px", height: "72px", "border-radius": "20px", margin: "0 auto 12px" } }, icon("download", 38)),
      h("h2", { style: { "font-size": "22px", "font-weight": "800" } }, "Lyra Downloads"),
      h("p", { class: "muted" }, `${t("Gerenciador de downloads")} · 0.2.0 (${t("protótipo")})`),
      h("p", { class: "small faint" }, `${engine.version} · SQLite · SHA-256`),
      h("p", { class: "small faint" }, "Lyra OS · GPL-3.0-or-later")),
  ], { wide: false });
}

// ---------- Janela, colar e soltar ----------

function setupWindow() {
  const controls = $("window-controls");
  const make = (name, label, fn) => h("button", { class: "wc", "aria-label": label, title: label, onclick: fn }, icon(name, 13));
  controls.append(make("minus", t("Minimizar"), () => win.minimize()), make("maximize", t("Maximizar"), () => win.toggleMaximize()), make("x", t("Fechar"), () => { win.close(); toast(t("A janela fecha, mas os downloads continuam em segundo plano.")); }));
  document.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || !e.target.closest("[data-drag]") || e.target.closest("button, input, select")) return;
    if (e.detail === 2) win.toggleMaximize(); else win.startDragging();
  });
}

function setupDropAndPaste() {
  const hint = $("drop-hint");
  const linkFrom = (dt) => (dt.getData("text/uri-list") || dt.getData("text/plain") || "").split(/\s+/).filter(validUrl).join("\n");
  let depth = 0;
  document.addEventListener("dragenter", (e) => { if (dragging || ![...e.dataTransfer.types].some((ty) => ty === "text/uri-list" || ty === "text/plain")) return; depth++; hint.classList.add("on"); });
  document.addEventListener("dragleave", () => { if (--depth <= 0) { depth = 0; hint.classList.remove("on"); } });
  document.addEventListener("dragover", (e) => { if (hint.classList.contains("on")) e.preventDefault(); });
  document.addEventListener("drop", (e) => {
    if (!hint.classList.contains("on")) return;
    e.preventDefault(); depth = 0; hint.classList.remove("on");
    const links = linkFrom(e.dataTransfer);
    if (links) openNewDownload(links); else toast(t("Isso não parece um link http:// ou https://."), { ic: "alert-circle" });
  });
  document.addEventListener("paste", (e) => {
    if (e.target.closest("input, textarea") || document.querySelector(".overlay")) return;
    const text = e.clipboardData.getData("text/plain").trim();
    const links = text.split(/\s+/).filter(validUrl);
    if (links.length) { e.preventDefault(); openNewDownload(links.join("\n")); }
  });
}

function setupKeys() {
  document.addEventListener("keydown", (e) => {
    if (document.querySelector(".overlay")) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "n") { e.preventDefault(); openNewDownload(); }
    else if (mod && (e.key === "k" || e.key === "f")) { e.preventDefault(); openPalette(); }
    else if (mod && e.key === ",") { e.preventDefault(); openPreferences(); }
    else if (mod && e.key === "?") { e.preventDefault(); openShortcuts(); }
    else if (e.altKey && /^[1-4]$/.test(e.key)) { e.preventDefault(); navigate(VIEWS[Number(e.key) - 1].id); }
  });
}

function start() {
  applyTheme();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  $("brand-mark").innerHTML = svg("download", 15);
  $("search-ic").innerHTML = svg("search", 15);
  $("menu-btn").innerHTML = svg("menu", 17);
  $("sidebar-toggle").innerHTML = svg("sidebar", 17);
  $("engine-ic").innerHTML = svg("arrow-down", 15);
  $("drop-ic").innerHTML = svg("link", 34);
  $("search-label").textContent = t("Buscar downloads");
  $("menu-btn").title = $("menu-btn").ariaLabel = t("Menu principal");
  $("menu-btn").addEventListener("click", (e) => openMainMenu(e.currentTarget));
  $("search-trigger").addEventListener("click", () => openPalette());
  $("engine-chip").addEventListener("click", openPreferences);
  $("scroller").addEventListener("scroll", (e) => $("headerbar").classList.toggle("scrolled", e.target.scrollTop > 4), { passive: true });
  clear($("header-actions"), headerActions());
  setupWindow();
  setupDropAndPaste();
  setupKeys();
  onTaskFinished((tk) => toast(t("{name} concluído.", { name: tk.filename }), { action: t("Abrir"), onAction: () => openFile(tk) }));
  onSnapshot((s) => { snap = s; update(); });
  navigate((location.hash.split("/")[1]) || "active");
}

start();

// Protótipo: `?open=new|details|prefs|palette|menu|row-menu|quit` abre a tela
// direto, para revisão e capturas de layout.
const demoOpen = new URLSearchParams(location.search).get("open");
if (demoOpen) {
  requestAnimationFrame(() => {
    const first = snap.tasks.find((tk) => tk.state === "baixando");
    ({
      new: () => openNewDownload("https://download.opensuse.org/distribution/leap/16.1/iso/Leap-16.1-DVD-x86_64.iso"),
      multi: () => openNewDownload("https://example.org/a.iso\nhttps://example.org/b.zip\nhttps://example.org/c.pdf"),
      details: () => openDetails(first),
      prefs: () => openPreferences(),
      palette: () => openPalette("iso"),
      menu: () => openMainMenu($("menu-btn")),
      "row-menu": () => openRowMenu(document.querySelector(".dl-row .more"), first),
      quit: () => quitService(),
      engine: () => api.breakEngine(),
    })[demoOpen]?.();
  });
}
