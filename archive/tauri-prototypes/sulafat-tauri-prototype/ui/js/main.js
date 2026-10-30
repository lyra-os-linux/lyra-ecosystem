// Sulafat — protótipo de layout e UX em Tauri, no padrão do Vega.
// Paridade com sulafat-gtk: hosts do ~/.ssh/config agrupados, sessões em abas
// com o `ssh` num terminal, conexão rápida, edição de host (incluindo opções
// avançadas e hosts somente leitura), arquivos via sftp://, backup e ações
// do sistema. No produto, o terminal será xterm.js ligado a um PTY no Rust.

import { api, commandFor, hosts, metas, settings, transcript } from "./demo.js";
import { svg, registerIcons } from "./icons.js";
import { t } from "./i18n.js";
import { win } from "./api.js";
import { h, icon, clear, normalize, button, iconButton, badge, segmented, list, row, banner, empty, toast, overlay, confirm, sheet, popover, menuItem } from "./ui.js";

registerIcons({
  sulafat: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/><circle cx="19" cy="5" r="2" fill="currentColor"/>',
  bolt: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  "rotate-ccw": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  "log-out": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
});

const $ = (id) => document.getElementById(id);
const GROUPLESS = "\u0000";

let filter = "";
const collapsed = new Set();
let tabs = []; // { id, alias?, title, color, target, lines, input, state: "running"|"ended", exit }
let current = null;
let configError = false;

function applyTheme() {
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.setProperty("--accent", dark ? "color-mix(in srgb, #3584e4 78%, #fff)" : "#3584e4");
}

const addr = (hst) => `${hst.user ? `${hst.user}@` : ""}${hst.host_name ?? hst.alias}${hst.port ? `:${hst.port}` : ""}`;
const connected = (alias) => tabs.some((tb) => tb.alias === alias && tb.state === "running");

// ---------- Hosts ----------

function hostMenu(anchor, hst) {
  const live = connected(hst.alias);
  const pop = popover(anchor, [
    hst.read_only ? null : live
      ? menuItem("power", t("Desconectar"), () => { pop.close(); disconnect(hst.alias); })
      : menuItem("terminal", t("Conectar"), () => { pop.close(); connect(hst); }, "Enter"),
    h("hr"),
    !hst.read_only && menuItem("cog", t("Editar"), () => { pop.close(); openHost(hst); }, "F2"),
    menuItem("copy", t("Duplicar"), () => { pop.close(); api.duplicate(hst.alias).then((a) => { renderHosts(); openHost(hosts.find((x) => x.alias === a)); }); }),
    !hst.alias.includes("*") && menuItem("folder", t("Abrir arquivos"), () => { pop.close(); openFiles(hst); }),
    !hst.read_only && h("hr"),
    !hst.read_only && menuItem("trash", t("Excluir"), () => { pop.close(); removeHost(hst); }, "Del"),
  ].filter(Boolean), "menu");
}

function hostRow(hst) {
  const m = metas[hst.alias] ?? {};
  const live = connected(hst.alias);
  const el = h("div", {
    class: `host ${current && tabs.find((tb) => tb.id === current)?.alias === hst.alias ? "active" : ""}`.trim(),
    tabindex: "0", role: "listitem", style: { "--hc": m.color ?? "transparent" },
    title: m.notes ?? "",
    ondblclick: () => !hst.read_only && connect(hst),
    onkeydown: (e) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" && !hst.read_only) { e.preventDefault(); connect(hst); }
      else if (e.key === "F2" && !hst.read_only) { e.preventDefault(); openHost(hst); }
      else if (e.key === "Delete" && !hst.read_only) { e.preventDefault(); removeHost(hst); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const all = [...document.querySelectorAll(".host")];
        all[all.indexOf(e.currentTarget) + (e.key === "ArrowDown" ? 1 : -1)]?.focus();
      }
    },
    oncontextmenu: (e) => { e.preventDefault(); hostMenu(e.currentTarget.querySelector(".more"), hst); },
  },
    h("span", { class: `farol ${live ? "on" : ""}`.trim(), title: live ? t("Conectado") : t("Sem sessão") }),
    h("div", { class: "body" },
      h("div", { class: "alias" }, h("span", {}, hst.alias), hst.read_only && badge(t("somente leitura"), "ro outline")),
      h("div", { class: "addr" }, hst.read_only ? t("modelo para vários hosts") : addr(hst))),
    h("div", { class: "acts" },
      !hst.read_only && iconButton(live ? "external" : "terminal", live ? t("Mostrar sessão") : t("Conectar"), (e) => { e.stopPropagation(); connect(hst); }, "sm"),
      h("button", { class: "icon-btn sm more", "aria-label": t("Ações do host"), title: t("Ações do host"), onclick: (e) => { e.stopPropagation(); hostMenu(e.currentTarget, hst); } }, icon("more", 16))));
  return el;
}

function renderHosts() {
  const q = normalize(filter);
  const shown = hosts.filter((hst) => !q || [hst.alias, hst.host_name, hst.user, metas[hst.alias]?.group, metas[hst.alias]?.notes].some((v) => v && normalize(v).includes(q)));
  const groups = new Map();
  for (const hst of shown) {
    const g = metas[hst.alias]?.group ?? GROUPLESS;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(hst);
  }
  const ordered = [...groups].sort(([a], [b]) => (a === GROUPLESS) - (b === GROUPLESS) || a.localeCompare(b));
  clear($("hosts"), shown.length === 0
    ? h("div", { class: "empty", style: { padding: "36px 12px" } }, h("p", {}, q ? t("Nenhum host corresponde a “{q}”.", { q: filter }) : t("Nenhum host no ~/.ssh/config.")))
    : ordered.map(([g, items]) => {
      const open = !collapsed.has(g);
      return h("div", { class: "host-group" },
        h("button", { "aria-expanded": String(open), onclick: () => { open ? collapsed.add(g) : collapsed.delete(g); renderHosts(); } },
          icon("chevron-down", 14), g === GROUPLESS ? t("Sem grupo") : g, h("span", { class: "n" }, String(items.length))),
        open && h("div", { role: "list" }, items.map(hostRow)));
    }));
  clear($("config-chip"), h("span", { class: "lead" }, icon(configError ? "alert" : "file", 17)),
    h("div", {}, h("strong", {}, "~/.ssh/config"), h("span", {}, configError ? t("Somente leitura: o arquivo não pôde ser lido") : t("{n} hosts · sincronizado", { n: hosts.length }))));
  $("config-chip").classList.toggle("bad", configError);
}

async function removeHost(hst) {
  const ok = await confirm({ title: t("Excluir o host?"), text: hst.alias, ic: "trash", tone: "danger", confirmLabel: t("Excluir"), confirmKind: "danger",
    facts: [{ icon: "file", text: t("O bloco Host sai do ~/.ssh/config. Um backup é feito antes de gravar.") }, { icon: "key", text: t("Chaves e known_hosts não são tocados.") }] });
  if (ok) { await api.remove(hst.alias); toast(t("Host excluído.")); renderHosts(); }
}

function openFiles(hst) {
  toast(t("Abrindo sftp://{a}/ no gerenciador de arquivos…", { a: addr(hst) }), { ic: "folder" });
}

// ---------- Diálogo de host ----------

const SWATCHES = ["#3584e4", "#2190a4", "#26a269", "#c88800", "#e66100", "#e01b24", "#d56199", "#9141ac", "#6f8396"];

function openHost(existing) {
  const hst = existing ? { ...existing } : { alias: "", host_name: "", user: "", port: null, identity_file: "", proxy_jump: null, extra: "", read_only: false };
  const m = existing ? { ...(metas[existing.alias] ?? {}) } : { group: null, color: null, notes: null };
  const input = (value, attrs = {}) => { const el = h("input", { class: "input", ...attrs }); el.value = value ?? ""; return el; };
  const alias = input(hst.alias, { placeholder: t("ex.: web01"), "aria-label": t("Alias"), spellcheck: "false" });
  const hostName = input(hst.host_name, { placeholder: t("web01.empresa.local ou 10.0.0.5"), "aria-label": t("Host"), class: "input mono", spellcheck: "false" });
  const user = input(hst.user, { placeholder: t("o mesmo do computador"), "aria-label": t("Usuário"), spellcheck: "false" });
  const port = input(hst.port ?? "", { type: "number", min: "1", max: "65535", placeholder: "22", "aria-label": t("Porta") });
  const key = input(hst.identity_file, { placeholder: t("padrão do ssh / ssh-agent"), "aria-label": t("Arquivo de identidade"), spellcheck: "false" });
  const groupNames = [...new Set(Object.values(metas).map((x) => x.group).filter(Boolean))].sort();
  const group = h("select", { class: "input", "aria-label": t("Grupo") },
    h("option", { value: "" }, t("Nenhum")), groupNames.map((g) => h("option", { value: g, selected: g === m.group }, g)), h("option", { value: "+new" }, t("Novo grupo…")));
  const newGroup = input("", { placeholder: t("Nome do novo grupo"), "aria-label": t("Nome do novo grupo"), hidden: true });
  group.addEventListener("change", () => { newGroup.hidden = group.value !== "+new"; if (!newGroup.hidden) newGroup.focus(); });
  let color = m.color;
  const swatches = h("div", { class: "swatches", role: "radiogroup", "aria-label": t("Cor") });
  const paintSw = () => clear(swatches,
    h("button", { class: "swatch-btn none", role: "radio", "aria-checked": String(!color), title: t("Sem cor"), onclick: () => { color = null; paintSw(); } }, icon("x", 14)),
    SWATCHES.map((c) => h("button", { class: "swatch-btn", role: "radio", "aria-checked": String(color === c), style: { "--sw": c }, title: c, onclick: () => { color = c; paintSw(); } })),
    h("label", { class: "swatch-btn", style: { "--sw": color && !SWATCHES.includes(color) ? color : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }, title: t("Outra cor…") },
      h("input", { type: "color", value: color ?? "#3584e4", onchange: (e) => { color = e.target.value; paintSw(); } })));
  paintSw();
  const notes = h("textarea", { class: "input", rows: "2", "aria-label": t("Notas"), style: { "font-family": "var(--font)" } });
  notes.value = m.notes ?? "";
  const extra = h("textarea", { class: "input", rows: "4", "aria-label": t("Opções avançadas"), spellcheck: "false", placeholder: "ServerAliveInterval 30\nForwardAgent no" });
  extra.value = [hst.proxy_jump ? `ProxyJump ${hst.proxy_jump}` : null, hst.extra].filter(Boolean).join("\n");
  const preview = h("span", {});
  const updatePreview = () => (preview.textContent = `ssh ${alias.value.trim() || "…"}`);
  alias.addEventListener("input", updatePreview);
  updatePreview();
  const err = h("p", { class: "hint err", role: "alert" });
  const save = button(t("Salvar"), { kind: "primary" });
  const close = sheet(existing ? t("Editar conexão") : t("Nova conexão"), [
    h("div", { class: "form-section" }, h("h4", {}, icon("globe", 15), t("Conexão")),
      h("div", { class: "form-grid" },
        h("div", { class: "field" }, h("label", {}, t("Alias")), alias, h("p", { class: "hint" }, t("O nome usado no ssh e na barra lateral."))),
        h("div", { class: "field" }, h("label", {}, t("Host")), hostName),
        h("div", { class: "field" }, h("label", {}, t("Usuário")), user),
        h("div", { class: "field" }, h("label", {}, t("Porta")), port),
        h("div", { class: "field full" }, h("label", {}, t("Arquivo de identidade (chave privada)")),
          h("div", { class: "key-pick" }, key, button(t("Escolher…"), { icon: "key", onClick: () => toast(t("Protótipo: seletor de arquivos em ~/.ssh.")) }))))),
    h("div", { class: "form-section" }, h("h4", {}, icon("layers", 15), t("Organização")),
      h("div", { class: "form-grid" },
        h("div", { class: "field" }, h("label", {}, t("Grupo")), group, newGroup),
        h("div", { class: "field" }, h("span", { class: "label" }, t("Cor")), swatches),
        h("div", { class: "field full" }, h("label", {}, t("Notas")), notes),
        h("p", { class: "hint full" }, t("Grupo, cor e notas ficam num arquivo do Sulafat; o ~/.ssh/config continua igual para o ssh.")))),
    h("details", { class: "form-section" }, h("summary", { class: "more-toggle" }, t("Opções avançadas")),
      h("div", { class: "field", style: { "margin-top": "10px" } }, extra, h("p", { class: "hint" }, t("Diretivas não mapeadas acima, em texto livre, uma por linha. São gravadas como estão.")))),
    h("div", { class: "cmd-preview" }, icon("terminal", 15), preview),
    err,
    h("div", { class: "sheet-actions" }, button(t("Cancelar"), { onClick: () => close() }), save),
  ]);
  save.addEventListener("click", async () => {
    const a = alias.value.trim();
    if (!a || /\s/.test(a)) { err.textContent = t("O alias não pode ficar vazio nem ter espaços."); return; }
    if (hosts.some((x) => x.alias === a && x.alias !== existing?.alias)) { err.textContent = t("Já existe um host com esse alias."); return; }
    const lines = extra.value.split("\n").map((l) => l.trim()).filter(Boolean);
    const pj = lines.find((l) => /^proxyjump\s/i.test(l));
    const g = group.value === "+new" ? newGroup.value.trim() || null : group.value || null;
    await api.save(existing?.alias, { ...hst, alias: a, host_name: hostName.value.trim() || null, user: user.value.trim() || null, port: Number(port.value) || null,
      identity_file: key.value.trim() || null, proxy_jump: pj ? pj.split(/\s+/)[1] : null, extra: lines.filter((l) => l !== pj).join("\n") },
    { group: g, color, notes: notes.value.trim() || null });
    close();
    toast(existing ? t("Host salvo no ~/.ssh/config.") : t("Host criado no ~/.ssh/config."));
    renderHosts();
  });
  requestAnimationFrame(() => (existing ? hostName : alias).focus());
}

// ---------- Sessões (abas) ----------

function connect(hst) {
  const existing = tabs.find((tb) => tb.alias === hst.alias);
  if (existing) { select(existing.id); if (existing.state === "ended") reconnect(existing); return; }
  open({ alias: hst.alias, title: hst.alias, color: metas[hst.alias]?.color, target: hst });
}

function quickConnect(target) {
  const m = target.trim().match(/^(?:([^@\s]+)@)?([^:@\s]+)(?::(\d+))?$/);
  if (!m) { toast(t("Use usuário@host ou usuário@host:porta."), { ic: "alert-circle" }); return false; }
  open({ alias: null, title: target.trim(), color: null, target: { alias: m[2], host_name: m[2], user: m[1] ?? null, port: m[3] ? Number(m[3]) : null } });
  return true;
}

function open(spec) {
  const tab = { id: api.nextTabId(), ...spec, lines: transcript(spec.target), input: "", state: "running", exit: null };
  tabs.push(tab);
  select(tab.id);
  renderHosts();
}

function select(id) {
  current = id;
  renderTabs();
  renderStage();
  renderHosts();
}

function disconnect(alias) {
  const tab = tabs.find((tb) => tb.alias === alias);
  if (tab) closeTab(tab, true);
}

async function closeTab(tab, force = false) {
  if (tab.state === "running" && !force) {
    const ok = await confirm({ title: t("Encerrar a sessão?"), text: t("Esta aba tem uma sessão SSH ativa. Fechar mesmo assim?"), ic: "terminal", confirmLabel: t("Encerrar"), confirmKind: "danger" });
    if (!ok) return;
  }
  const i = tabs.indexOf(tab);
  tabs.splice(i, 1);
  if (current === tab.id) current = tabs[Math.min(i, tabs.length - 1)]?.id ?? null;
  renderTabs(); renderStage(); renderHosts();
}

function reconnect(tab) {
  tab.state = "running"; tab.exit = null;
  tab.lines.push([["d", ""]], [["d", `— ${t("reconectado")} —`]]);
  renderTabs(); renderStage(); renderHosts();
}

function renderTabs() {
  clear($("tabs"), tabs.map((tb) => h("button", {
    class: "tab", role: "tab", "aria-selected": String(tb.id === current), style: { "--tc": tb.color ?? "var(--fg-3)" },
    title: tb.alias ? `ssh ${tb.alias}` : `ssh ${tb.title}`,
    onclick: () => select(tb.id),
    onauxclick: (e) => { if (e.button === 1) closeTab(tb); },
  }, h("span", { class: `dot ${tb.state === "ended" ? "ended" : ""}`.trim() }), h("span", { class: "label" }, tb.title),
    h("span", { class: "x", role: "button", "aria-label": t("Fechar"), onclick: (e) => { e.stopPropagation(); closeTab(tb); } }, icon("x", 13)))),
  iconButton("bolt", t("Conexão rápida"), openQuick, "sm tab-add"));
  const tab = tabs.find((tb) => tb.id === current);
  const hst = tab?.alias && hosts.find((x) => x.alias === tab.alias);
  clear($("header-actions"),
    hst && iconButton("folder", t("Abrir arquivos"), () => openFiles(hst)),
    tab && h("button", { class: "icon-btn", "aria-label": t("Mais"), title: t("Mais"), onclick: (e) => tabMenu(e.currentTarget, tab) }, icon("more", 17)),
    h("span", { class: "header-sep" }));
  document.title = tab ? `${tab.title} — Sulafat` : "Sulafat";
}

function tabMenu(anchor, tab) {
  const hst = tab.alias && hosts.find((x) => x.alias === tab.alias);
  const pop = popover(anchor, [
    menuItem("copy", t("Copiar comando ssh"), () => { pop.close(); navigator.clipboard?.writeText(`ssh ${tab.alias ?? tab.title}`); toast(t("Comando copiado.")); }),
    hst && !hst.read_only && menuItem("cog", t("Editar host"), () => { pop.close(); openHost(hst); }),
    tab.state === "ended" && menuItem("rotate-ccw", t("Reconectar"), () => { pop.close(); reconnect(tab); }),
    h("hr"),
    menuItem("x", t("Fechar aba"), () => { pop.close(); closeTab(tab); }, "Ctrl W"),
  ].filter(Boolean), "menu");
}

function promptSegs(tab) {
  const who = `${tab.target.user ?? "rodrigo"}@${(tab.target.host_name ?? tab.target.alias).split(".")[0]}`;
  return [["g", who], ["", ":"], ["b", "~"], ["", "$ "]];
}

function renderStage() {
  const stage = $("stage");
  const tab = tabs.find((tb) => tb.id === current);
  stage.classList.toggle("empty", !tab);
  if (!tab) {
    const q = h("input", { class: "input", placeholder: "usuário@host[:porta]", "aria-label": t("Destino da conexão rápida"), spellcheck: "false" });
    q.addEventListener("keydown", (e) => { if (e.key === "Enter" && quickConnect(q.value)) q.value = ""; });
    clear(stage, h("div", { class: "term-empty" }, h("div", { class: "empty" },
      h("div", { class: "art" }, icon("terminal", 38)),
      h("h3", {}, t("Nenhuma sessão aberta")),
      h("p", {}, t("Escolha um host na barra lateral ou conecte direto:")),
      h("div", { class: "quick" }, q, button(t("Conectar"), { kind: "primary", onClick: () => { if (quickConnect(q.value)) q.value = ""; } })))));
    return;
  }
  const term = h("div", { class: "term", tabindex: "0", role: "log", "aria-label": t("Terminal de {t}", { t: tab.title }) });
  const seg = ([cls, text]) => (cls ? h("span", { class: cls }, text) : text);
  for (const line of tab.lines) term.append(h("div", {}, line.map(seg)));
  if (tab.state === "running") term.append(h("div", {}, promptSegs(tab).map(seg), tab.input, h("span", { class: "cursor" })));
  term.addEventListener("keydown", (e) => {
    if (tab.state !== "running" || e.ctrlKey && !["d", "c", "l"].includes(e.key)) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const cmd = tab.input.trim();
      tab.lines.push([...promptSegs(tab), ["", tab.input]]);
      tab.input = "";
      if (cmd === "exit" || cmd === "logout") { tab.state = "ended"; tab.exit = 0; tab.lines.push([["d", "logout"]], [["d", `Connection to ${tab.target.host_name ?? tab.target.alias} closed.`]]); }
      else if (cmd === "clear") tab.lines = [];
      else if (cmd) tab.lines.push([["d", t("(protótipo: no produto, a saída real do servidor aparece aqui)")]]);
      renderStage(); renderTabs(); renderHosts();
    } else if (e.ctrlKey && e.key === "d") { e.preventDefault(); tab.state = "ended"; tab.exit = 0; renderStage(); renderTabs(); renderHosts(); }
    else if (e.ctrlKey && e.key === "l") { e.preventDefault(); tab.lines = []; renderStage(); }
    else if (e.key === "Backspace") { e.preventDefault(); tab.input = tab.input.slice(0, -1); renderStage(); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) { e.preventDefault(); tab.input += e.key; renderStage(); }
  });
  clear(stage, term,
    tab.state === "ended" && h("div", { class: "session-ended", role: "status" }, icon("alert", 20),
      h("div", { class: "body" }, h("strong", {}, t("Sessão encerrada")), h("small", {}, t("ssh saiu com o código {c}", { c: tab.exit ?? 255 }))),
      button(t("Fechar"), { size: "sm", onClick: () => closeTab(tab) }),
      button(t("Reconectar"), { size: "sm", kind: "primary", icon: "rotate-ccw", onClick: () => reconnect(tab) })));
  term.scrollTop = term.scrollHeight;
  requestAnimationFrame(() => term.focus());
}

// ---------- Conexão rápida, configurações, menu ----------

function openQuick() {
  const q = h("input", { class: "input mono", placeholder: "usuário@host[:porta]", "aria-label": t("Destino da conexão rápida"), spellcheck: "false", style: { width: "100%" } });
  const go = button(t("Conectar"), { kind: "primary", onClick: () => { if (quickConnect(q.value)) close(); } });
  q.addEventListener("keydown", (e) => { if (e.key === "Enter") go.click(); });
  const close = sheet(t("Conexão rápida"), [
    h("p", { class: "muted", style: { "margin-bottom": "12px" } }, t("Abre uma sessão sem salvar o host. Chaves, ssh-agent e o ~/.ssh/config valem como no ssh.")),
    q, h("div", { class: "sheet-actions" }, button(t("Cancelar"), { onClick: () => close() }), go)], { wide: false });
  requestAnimationFrame(() => q.focus());
}

function openSettings() {
  const font = h("select", { class: "input", "aria-label": t("Fonte") }, ["Adwaita Mono 11", "Adwaita Mono 12", "Source Code Pro 11", "JetBrains Mono 11", "DejaVu Sans Mono 11"].map((f) => h("option", { selected: f === settings.font }, f)));
  font.addEventListener("change", () => { settings.font = font.value; document.documentElement.style.setProperty("--term-font", font.value); });
  const lines = h("input", { class: "input", type: "number", min: "100", max: "1000000", step: "1000", value: String(settings.scrollback_lines), "aria-label": t("Linhas de histórico"), style: { width: "120px" } });
  sheet(t("Configurações"), [
    h("div", { class: "pref-group" }, h("h4", {}, t("Terminal")), list(
      h("div", { class: "list-row" }, h("div", { class: "body" }, h("div", { class: "title" }, t("Fonte"))), h("div", { class: "suffix" }, font)),
      h("div", { class: "list-row" }, h("div", { class: "body" }, h("div", { class: "title" }, t("Linhas de histórico")), h("div", { class: "subtitle" }, t("Quantas linhas cada aba guarda para rolar para trás."))), h("div", { class: "suffix" }, lines)),
    )),
  ], { wide: false });
}

async function restoreBackup() {
  const ok = await confirm({ title: t("Restaurar o backup mais recente?"), text: "~/.ssh/config", ic: "rotate-ccw", confirmLabel: t("Restaurar"),
    facts: [{ icon: "info", text: t("O Sulafat guarda um backup antes de cada gravação. O arquivo atual vira um backup também.") }] });
  if (ok) { configError = false; toast(t("Backup restaurado.")); renderHosts(); renderStage(); }
}

async function systemAction(kind) {
  const spec = {
    logout: [t("Sair da sessão?"), t("Sua sessão e todos os aplicativos abertos serão fechados."), "log-out", t("Sair")],
    restart: [t("Reiniciar?"), t("O computador vai reiniciar e todas as sessões ativas serão encerradas."), "rotate-ccw", t("Reiniciar")],
    poweroff: [t("Desligar?"), t("O computador e todas as sessões ativas serão desligados."), "power", t("Desligar")],
  }[kind];
  await confirm({ title: spec[0], text: spec[1], ic: spec[2], tone: "danger", confirmLabel: spec[3], confirmKind: "danger" });
}

function openMainMenu(anchor) {
  const pop = popover(anchor, [
    menuItem("plus", t("Nova conexão"), () => { pop.close(); openHost(); }, "Ctrl N"),
    menuItem("bolt", t("Conexão rápida"), () => { pop.close(); openQuick(); }, "Ctrl L"),
    h("hr"),
    menuItem("cog", t("Configurações"), () => { pop.close(); openSettings(); }, "Ctrl ,"),
    menuItem("rotate-ccw", t("Restaurar o backup mais recente…"), () => { pop.close(); restoreBackup(); }),
    menuItem("keyboard", t("Atalhos de teclado"), () => { pop.close(); openShortcuts(); }, "Ctrl ?"),
    menuItem("star", t("Sobre o Sulafat"), () => { pop.close(); openAbout(); }),
    h("hr"),
    menuItem("log-out", t("Sair da sessão…"), () => { pop.close(); systemAction("logout"); }),
    menuItem("rotate-ccw", t("Reiniciar…"), () => { pop.close(); systemAction("restart"); }),
    menuItem("power", t("Desligar…"), () => { pop.close(); systemAction("poweroff"); }),
  ], "menu");
}

function openShortcuts() {
  const rows = [[t("Nova conexão"), "Ctrl N"], [t("Conexão rápida"), "Ctrl L"], [t("Buscar hosts"), "Ctrl F"], [t("Conectar ao host selecionado"), "Enter"],
    [t("Editar o host selecionado"), "F2"], [t("Fechar a aba"), "Ctrl W"], [t("Aba anterior / próxima"), "Ctrl PgUp/PgDn"], [t("Configurações"), "Ctrl ,"]];
  sheet(t("Atalhos de teclado"), list(rows.map(([l, k]) => h("div", { class: "list-row" }, h("div", { class: "body" }, l), h("div", { class: "suffix" }, k.split(" ").map((x) => h("kbd", {}, x)))))), { wide: false });
}

function openAbout() {
  sheet(t("Sobre o Sulafat"), [h("div", { style: { "text-align": "center", padding: "6px 0 4px" } },
    h("div", { class: "brand-mark", style: { width: "72px", height: "72px", "border-radius": "20px", margin: "0 auto 12px" } }, icon("sulafat", 38)),
    h("h2", { style: { "font-size": "22px", "font-weight": "800" } }, "Sulafat"),
    h("p", { class: "muted" }, `${t("Cliente SSH do Lyra OS")} · ${t("protótipo")}`),
    h("p", { class: "small faint" }, "OpenSSH · ~/.ssh/config · GPL-3.0-or-later"))], { wide: false });
}

function setupWindow() {
  const make = (name, label, fn) => h("button", { class: "wc", "aria-label": label, title: label, onclick: fn }, icon(name, 13));
  $("window-controls").append(make("minus", t("Minimizar"), () => win.minimize()), make("maximize", t("Maximizar"), () => win.toggleMaximize()),
    make("x", t("Fechar"), async () => {
      if (tabs.some((tb) => tb.state === "running") && !(await confirm({ title: t("Fechar a janela?"), text: t("{n} sessões SSH ativas serão encerradas.", { n: tabs.filter((tb) => tb.state === "running").length }), ic: "terminal", confirmLabel: t("Fechar"), confirmKind: "danger" }))) return;
      win.close();
    }));
  document.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || !e.target.closest("[data-drag]") || e.target.closest("button, input, select")) return;
    if (e.detail === 2) win.toggleMaximize(); else win.startDragging();
  });
  document.addEventListener("keydown", (e) => {
    if (document.querySelector(".overlay")) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === "n") { e.preventDefault(); openHost(); }
    else if (mod && k === "l") { e.preventDefault(); openQuick(); }
    else if (mod && k === "f") { e.preventDefault(); $("search").focus(); }
    else if (mod && k === "w" && current) { e.preventDefault(); closeTab(tabs.find((tb) => tb.id === current)); }
    else if (mod && e.key === ",") { e.preventDefault(); openSettings(); }
    else if (mod && (e.key === "PageDown" || e.key === "PageUp") && tabs.length) {
      e.preventDefault();
      const i = tabs.findIndex((tb) => tb.id === current);
      select(tabs[(i + (e.key === "PageDown" ? 1 : -1) + tabs.length) % tabs.length].id);
    }
  });
}

applyTheme();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
$("brand-mark").innerHTML = svg("sulafat", 15);
$("search-ic").innerHTML = svg("search", 15);
$("quick-btn").innerHTML = svg("bolt", 17);
$("add-btn").innerHTML = svg("plus", 17);
$("menu-btn").innerHTML = svg("menu", 17);
$("sidebar-toggle").innerHTML = svg("sidebar", 17);
$("quick-btn").title = $("quick-btn").ariaLabel = t("Conexão rápida");
$("add-btn").title = $("add-btn").ariaLabel = t("Nova conexão");
$("menu-btn").title = $("menu-btn").ariaLabel = t("Menu principal");
$("search").placeholder = t("Buscar hosts…");
$("search").addEventListener("input", (e) => { filter = e.target.value; renderHosts(); });
$("quick-btn").addEventListener("click", openQuick);
$("add-btn").addEventListener("click", () => openHost());
$("menu-btn").addEventListener("click", (e) => openMainMenu(e.currentTarget));
setupWindow();

// Protótipo: `?open=…` abre uma tela direto, para revisão.
const demo = new URLSearchParams(location.search).get("open");
if (demo === "error") configError = true;
renderHosts();
if (demo === "sessions" || demo === "ended") {
  connect(hosts[0]); connect(hosts[1]); quickConnect("admin@10.0.0.9:2201");
  select(tabs[0].id);
  if (demo === "ended") { tabs[0].state = "ended"; tabs[0].exit = 255; select(tabs[0].id); }
} else {
  renderTabs(); renderStage();
}
if (demo === "error") $("hosts").before(h("div", { style: { padding: "0 10px 8px" } }, banner("danger", "alert-circle", t("Não foi possível carregar a configuração SSH"), t("O Sulafat fica em somente leitura até a configuração poder ser carregada."), button(t("Restaurar backup"), { size: "sm", onClick: restoreBackup }))));
({ edit: () => openHost(hosts[1]), new: () => openHost(), quick: () => openQuick(), settings: () => openSettings(), menu: () => openMainMenu($("menu-btn")), hostmenu: () => hostMenu(document.querySelector(".host .more"), hosts[0]) })[demo]?.();
