// Beam — protótipo de layout e UX em Tauri, no padrão do Vega.
// Paridade com beam-gtk: conexões (criar, editar, duplicar, excluir, buscar),
// conexão com verificação TOFU do certificado e senha no chaveiro, e
// certificados confiáveis. A sessão abre numa janela própria (session.html).

import { api, initial, RESOLUTIONS, sessions } from "./demo.js";
import { svg, registerIcons } from "./icons.js";
import { t } from "./i18n.js";
import { win } from "./api.js";
import {
  h, icon, clear, normalize, button, iconButton, badge, toggle, segmented, list, row, section, banner, empty,
  toast, overlay, confirm, sheet, popover, menuItem, fail, busy,
} from "./ui.js";

/** Matiz estável por nome, para a miniatura de cada conexão. */
function hueFor(text) {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return String(Math.abs(hash) % 360);
}

registerIcons({
  beam: '<path d="M4 18 18 4"/><path d="M14 4h4v4"/><circle cx="6" cy="18" r="2.5"/><path d="M9.5 18H20"/>',
  "screen-share": '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m9 10 3-3 3 3M12 7v6"/>',
  certificate: '<path d="M14 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8"/><path d="M7 7h10M7 11h4"/><circle cx="18" cy="17" r="3"/><path d="m16.5 19.5-1 3 2.5-1.2 2.5 1.2-1-3"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.36 7.4 5 12 5s8.58 3.36 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.64 16.6 19 12 19s-8.58-3.36-9.94-6.65"/><circle cx="12" cy="12" r="3"/>',
  "eye-off": '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.6 0 8.58 3.36 9.94 6.65a1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.44 2.49"/><path d="M14.08 14.16a3 3 0 0 1-4.24-4.24"/><path d="M17.48 17.5A10.75 10.75 0 0 1 12 19c-4.6 0-8.58-3.36-9.94-6.65a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14"/><path d="m2 2 20 20"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/>',
  "list-all": '<path d="M3 6h.01M3 12h.01M3 18h.01M8 6h13M8 12h13M8 18h13"/>',
});

const $ = (id) => document.getElementById(id);

let view = "connections";
let layout = "grid";
let filter = "";
let profiles = [];
let trusted = [];

function applyTheme() {
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.setProperty("--accent", dark ? "color-mix(in srgb, #3584e4 78%, #fff)" : "#3584e4");
}

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const address = (p) => `${p.username ? `${p.domain ? `${p.domain}\\` : ""}${p.username}@` : ""}${p.host}${p.port !== 3389 ? `:${p.port}` : ""}`;
const resLabel = (p) => `${p.resolution.width}×${p.resolution.height}`;

// ---------- Conexões ----------

function connectionMenu(anchor, p) {
  const pop = popover(anchor, [
    menuItem("screen-share", t("Conectar"), () => { pop.close(); connect(p); }, "Enter"),
    h("hr"),
    menuItem("cog", t("Editar"), () => { pop.close(); openProfile(p); }),
    menuItem("copy", t("Duplicar"), () => { pop.close(); api.duplicate(p.id, t("cópia")).then((c) => { toast(t("Conexão duplicada.")); load().then(() => openProfile(profiles.find((x) => x.id === c.id))); }); }),
    h("hr"),
    menuItem("trash", t("Excluir"), () => { pop.close(); remove(p); }, "Del"),
  ], "menu");
}

async function remove(p) {
  const ok = await confirm({ title: t("Excluir a conexão?"), text: p.name, ic: "trash", tone: "red", confirmLabel: t("Excluir"), confirmKind: "danger",
    facts: [{ icon: "key", text: t("A senha salva no chaveiro também é apagada, se nenhuma outra conexão usar o mesmo usuário e servidor.") }, { icon: "certificate", text: t("O certificado confiável do servidor é mantido.") }] });
  if (ok) { await api.remove(p.id); toast(t("Conexão excluída.")); load(); }
}

function connectionCard(p) {
  const live = p.session;
  const el = h("div", {
    class: `conn-card ${live ? "live" : ""}`.trim(), tabindex: "0", role: "listitem", "aria-label": `${p.name}, ${address(p)}`,
    ondblclick: () => connect(p),
    onkeydown: (e) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter") { e.preventDefault(); connect(p); }
      else if (e.key === "Delete") { e.preventDefault(); remove(p); }
      else if (e.key === "F2") { e.preventDefault(); openProfile(p); }
    },
    oncontextmenu: (e) => { e.preventDefault(); connectionMenu(e.currentTarget.querySelector(".more"), p); },
  },
    h("div", { class: "conn-top" },
      h("span", { class: "conn-screen", style: { "--hue": hueFor(p.name) } }, h("span", { class: "initials" }, initials(p.name))),
      h("div", { class: "conn-name" }, h("strong", { title: p.name }, p.name), h("span", { title: address(p) }, address(p))),
      h("button", { class: "icon-btn sm more", "aria-label": t("Ações da conexão"), title: t("Ações da conexão"), onclick: (e) => { e.stopPropagation(); connectionMenu(e.currentTarget, p); } }, icon("more", 17))),
    h("div", { class: "conn-meta" },
      badge(resLabel(p), "outline", "monitor"),
      badge(t("{bits} bits", { bits: p.color_depth }), "outline"),
      p.fullscreen && badge(t("Tela cheia"), "outline", "maximize")),
    h("div", { class: "conn-foot" },
      live
        ? [h("span", { class: "conn-live" }, h("i"), t("Conectado")), h("span", { class: "spacer" }), button(t("Mostrar sessão"), { size: "sm", icon: "external", onClick: () => openSessionWindow(p) })]
        : button(t("Conectar"), { kind: "primary", icon: "screen-share", onClick: () => connect(p) })),
  );
  return el;
}

function connectionRow(p) {
  return h("div", { class: "list-row clickable", tabindex: "0", ondblclick: () => connect(p), onkeydown: (e) => { if (e.key === "Enter" && e.target === e.currentTarget) connect(p); } },
    h("span", { class: "lead screen", style: { "--hue": hueFor(p.name) } }, initials(p.name)),
    h("div", { class: "body" }, h("div", { class: "title" }, p.name), h("div", { class: "subtitle" }, `${address(p)} · ${resLabel(p)}`)),
    h("div", { class: "suffix" },
      p.session ? h("span", { class: "conn-live" }, h("i"), t("Conectado")) : button(t("Conectar"), { size: "sm", kind: "primary", onClick: () => connect(p) }),
      h("button", { class: "icon-btn sm more", "aria-label": t("Ações da conexão"), onclick: (e) => connectionMenu(e.currentTarget, p) }, icon("more", 17))));
}

function renderConnections() {
  const shown = profiles.filter((p) => !filter || [p.name, p.host, p.username].some((v) => normalize(v ?? "").includes(normalize(filter))));
  if (!profiles.length) {
    return empty("screen-share", t("Nenhuma conexão"), t("Crie a primeira conexão para acessar um computador Windows pela rede."),
      button(t("Nova conexão"), { kind: "primary pill", icon: "plus", onClick: () => openProfile() }));
  }
  if (!shown.length) return empty("search", t("Nada encontrado"), t("Nenhuma conexão corresponde a “{q}”.", { q: filter }));
  return layout === "grid"
    ? h("div", { class: "conn-grid", role: "list" }, shown.map(connectionCard))
    : h("div", { class: "list conn-list" }, shown.map(connectionRow));
}

// ---------- Perfil (nova / editar) ----------

function openProfile(existing) {
  const p = existing ? structuredClone(existing) : { name: "", host: "", port: 3389, username: "", domain: null, resolution: { width: 1920, height: 1080 }, color_depth: 32, fullscreen: true };
  const input = (value, attrs = {}) => { const el = h("input", { class: "input", ...attrs }); el.value = value ?? ""; return el; };
  const name = input(p.name, { placeholder: t("Ex.: Estação do escritório"), "aria-label": t("Nome da conexão") });
  const host = input(p.host, { placeholder: t("nome.dominio.local ou 192.168.0.10"), "aria-label": t("Servidor"), class: "input mono", spellcheck: "false" });
  const port = input(String(p.port), { type: "number", min: "1", max: "65535", "aria-label": t("Porta"), class: "input port" });
  const user = input(p.username, { "aria-label": t("Usuário"), spellcheck: "false" });
  const domain = input(p.domain, { placeholder: t("Opcional"), "aria-label": t("Domínio"), spellcheck: "false" });
  const err = h("p", { class: "hint err" });

  let res = RESOLUTIONS.some(([w, hh]) => w === p.resolution.width && hh === p.resolution.height) ? `${p.resolution.width}x${p.resolution.height}` : "custom";
  const cw = input(String(p.resolution.width), { type: "number", min: "640", max: "8192", "aria-label": t("Largura personalizada") });
  const ch = input(String(p.resolution.height), { type: "number", min: "480", max: "8192", "aria-label": t("Altura personalizada") });
  const custom = h("div", { class: "row-flex", hidden: res !== "custom" }, cw, h("span", { class: "muted" }, "×"), ch, h("span", { class: "small muted" }, t("pixels")));
  const resGrid = h("div", { class: "res-grid", role: "radiogroup", "aria-label": t("Resolução") });
  const paintRes = () => {
    clear(resGrid, [...RESOLUTIONS.map(([w, hh]) => [`${w}x${hh}`, `${w}×${hh}`, w, hh]), ["custom", t("Personalizada…"), 0, 0]].map(([id, label, w, hh]) =>
      h("button", { class: "res-opt", role: "radio", "aria-checked": String(res === id), onclick: () => { res = id; custom.hidden = id !== "custom"; paintRes(); } },
        id === "custom" ? icon("cog", 22) : h("span", { class: "shape", style: { width: `${Math.round(w / 64)}px`, height: `${Math.round(hh / 64)}px` } }), label)));
  };
  paintRes();
  let depth = p.color_depth;
  let full = p.fullscreen;

  const save = button(t("Salvar"), { kind: "primary" });
  const close = sheet(existing ? t("Editar conexão") : t("Nova conexão"), [
    h("div", { class: "form-section" }, h("h4", {}, icon("globe", 15), t("Conexão")),
      h("div", { class: "form-grid" },
        h("div", { class: "field full" }, h("label", {}, t("Nome da conexão")), name),
        h("div", { class: "field" }, h("label", {}, t("Servidor (host)")), host),
        h("div", { class: "field" }, h("label", {}, t("Porta")), port))),
    h("div", { class: "form-section" }, h("h4", {}, icon("user", 15), t("Autenticação")),
      h("div", { class: "form-grid" },
        h("div", { class: "field" }, h("label", {}, t("Usuário")), user),
        h("div", { class: "field" }, h("label", {}, t("Domínio (opcional)")), domain),
        h("p", { class: "hint full" }, t("A senha é pedida ao conectar e pode ficar guardada no chaveiro do GNOME. Ela nunca é gravada em arquivo.")))),
    h("div", { class: "form-section" }, h("h4", {}, icon("monitor", 15), t("Tela")),
      h("div", { class: "field" }, h("span", { class: "label" }, t("Resolução")), resGrid, custom),
      h("div", { class: "form-grid", style: { "margin-top": "14px" } },
        h("div", { class: "field" }, h("span", { class: "label" }, t("Profundidade de cor")), segmented([{ id: 16, label: t("16 bits") }, { id: 32, label: t("32 bits") }], depth, (v) => (depth = v))),
        h("div", { class: "field" }, h("span", { class: "label" }, t("Ao conectar")), h("label", { class: "row-flex small" }, toggle(full, (v) => (full = v), t("Abrir em tela cheia")), t("Abrir em tela cheia"))))),
    err,
    h("div", { class: "sheet-actions" }, button(t("Cancelar"), { onClick: () => close() }), save),
  ]);
  save.addEventListener("click", async () => {
    const values = {
      ...p, name: name.value.trim(), host: host.value.trim(), port: Number(port.value), username: user.value.trim(), domain: domain.value.trim() || null,
      resolution: res === "custom" ? { width: Number(cw.value), height: Number(ch.value) } : { width: Number(res.split("x")[0]), height: Number(res.split("x")[1]) },
      color_depth: depth, fullscreen: full,
    };
    if (!values.name || !values.host) { err.textContent = t("Preencha o nome e o servidor."); return; }
    if (!(values.port >= 1 && values.port <= 65535)) { err.textContent = t("A porta vai de 1 a 65535."); return; }
    await api.save(values);
    close();
    toast(existing ? t("Conexão salva.") : t("Conexão criada."));
    load();
  });
  requestAnimationFrame(() => (existing ? host : name).focus());
}

// ---------- Conectar: certificado (TOFU), senha e sessão ----------

const groups = (fingerprint) => h("div", { class: "fingerprint" }, fingerprint.split(":").reduce((acc, byte, i) => { if (i % 2 === 0) acc.push(byte); else acc[acc.length - 1] += byte; return acc; }, []).map((g) => h("span", {}, g)));

function verifyCertificate(cert) {
  return new Promise((resolve) => {
    let ok = false;
    const finish = () => resolve(ok);
    if (cert.status === "first") {
      const accept = button(t("Confiar e conectar"), { kind: "primary", onClick: () => { ok = true; close(); } });
      const close = overlay(h("div", { class: "dialog", role: "alertdialog", "aria-label": t("Verificar a identidade do servidor") },
        h("div", { class: "dialog-body" },
          h("div", { class: "d-ic" }, icon("certificate", 26)),
          h("h2", {}, t("Verificar a identidade do servidor")),
          h("p", {}, t("É a primeira conexão a {address}. Confirme com o administrador do servidor que esta impressão digital é a mesma:", { address: cert.address })),
          h("div", { class: "dialog-extra" }, h("div", { class: "cert-label" }, t("Impressão digital (SHA-256)")), groups(cert.fingerprint),
            h("ul", { class: "facts", style: { "margin-top": "14px" } }, h("li", {}, icon("check", 16), h("span", {}, t("Ela fica salva: nas próximas conexões o Beam só avisa se o certificado mudar.")))))),
        h("div", { class: "dialog-actions" }, h("button", { class: "btn", onclick: () => close() }, t("Cancelar")), accept)), { onClose: finish });
      requestAnimationFrame(() => accept.focus());
    } else {
      const cancel = h("button", { class: "btn primary", onclick: () => close() }, t("Cancelar conexão"));
      const close = overlay(h("div", { class: "dialog", role: "alertdialog", "aria-label": t("Possível ataque detectado") },
        h("div", { class: "dialog-body" },
          h("div", { class: "d-ic danger" }, icon("alert", 26)),
          h("h2", {}, t("Possível ataque detectado")),
          h("p", {}, t("O certificado de {address} mudou desde a última conexão. Alguém pode estar se passando pelo servidor. Só continue se o administrador confirmar a troca.", { address: cert.address })),
          h("div", { class: "dialog-extra" },
            h("div", { class: "cert-label" }, t("Impressão anterior")), groups(cert.previous),
            h("div", { class: "cert-label" }, t("Impressão atual")), groups(cert.fingerprint))),
        h("div", { class: "dialog-actions" }, h("button", { class: "btn danger-soft", onclick: () => { ok = true; close(); } }, t("Confiar mesmo assim")), cancel)), { onClose: finish });
      requestAnimationFrame(() => cancel.focus());
    }
  });
}

function askPassword(p) {
  return new Promise((resolve) => {
    let result = null;
    const pass = h("input", { class: "input", type: "password", "aria-label": t("Senha"), autocomplete: "current-password" });
    const reveal = iconButton("eye", t("Mostrar senha"), () => { const show = pass.type === "password"; pass.type = show ? "text" : "password"; clear(reveal, icon(show ? "eye-off" : "eye", 17)); pass.focus(); }, "sm");
    let keep = true;
    const go = button(t("Conectar"), { kind: "primary", disabled: true, onClick: () => { result = { password: pass.value, keep }; close(); } });
    pass.addEventListener("input", () => (go.disabled = !pass.value));
    pass.addEventListener("keydown", (e) => { if (e.key === "Enter" && pass.value) go.click(); });
    const close = overlay(h("div", { class: "dialog", role: "dialog", "aria-label": t("Autenticação necessária") },
      h("div", { class: "dialog-body" },
        h("div", { class: "d-ic" }, icon("lock", 26)),
        h("h2", {}, t("Autenticação necessária")),
        h("p", {}, t("Senha de {user} em {host}", { user: p.domain ? `${p.domain}\\${p.username}` : p.username || t("(usuário do servidor)"), host: p.host })),
        h("div", { class: "dialog-extra" },
          h("div", { class: "input-reveal" }, pass, reveal),
          h("label", { class: "row-flex small", style: { "margin-top": "14px", "justify-content": "space-between" } },
            h("span", {}, h("strong", {}, t("Salvar no chaveiro")), h("br"), h("span", { class: "muted" }, t("Não pergunta de novo neste computador."))),
            toggle(keep, (v) => (keep = v), t("Salvar no chaveiro"))))),
      h("div", { class: "dialog-actions" }, h("button", { class: "btn", onclick: () => close() }, t("Cancelar")), go)), { onClose: () => resolve(result) });
    requestAnimationFrame(() => pass.focus());
  });
}

async function connect(p) {
  if (p.session) { openSessionWindow(p); return; }
  const stop = toast(t("Conectando a {host}…", { host: p.host }), { ic: "screen-share", timeout: 60000 });
  const cert = await api.probeCertificate(p);
  stop();
  if (cert.status !== "trusted") {
    if (!(await verifyCertificate(cert))) { toast(t("Conexão cancelada: certificado não confirmado."), { ic: "info" }); return; }
    await api.trust(cert.address, cert.fingerprint);
  }
  if (api.needsPassword(p)) {
    const auth = await askPassword(p);
    if (!auth) return;
    if (auth.keep) await api.savePassword(p.id);
  }
  sessions.set(p.id, "connecting");
  openSessionWindow(p);
  load();
}

function openSessionWindow(p) {
  const url = `session.html?name=${encodeURIComponent(p.name)}&host=${encodeURIComponent(p.host)}&port=${p.port}&w=${p.resolution.width}&h=${p.resolution.height}&depth=${p.color_depth}&full=${p.fullscreen ? 1 : 0}`;
  window.open(url, `beam-${p.id}`, "width=1100,height=720");
}

// ---------- Certificados confiáveis ----------

function renderCertificates() {
  if (!trusted.length) return empty("certificate", t("Nenhum certificado confiável ainda"), t("Ao confirmar a impressão digital na primeira conexão a um servidor, ela aparece aqui."));
  return [
    h("p", { class: "muted", style: { margin: "6px 2px 16px", "max-width": "70ch" } }, t("Impressões digitais confirmadas em conexões anteriores (verificação TOFU). Remover uma delas faz o Beam pedir a confirmação de novo na próxima conexão.")),
    list(trusted.map((c) => row({
      icon: "certificate", tint: "green", title: c.address, subtitle: c.fingerprint, cls: "cert-row",
      suffix: iconButton("trash", t("Remover confiança"), async () => {
        const ok = await confirm({ title: t("Remover a confiança?"), text: c.address, ic: "certificate", confirmLabel: t("Remover"), confirmKind: "danger",
          facts: [{ icon: "info", text: t("Na próxima conexão o Beam vai mostrar a impressão digital para você confirmar de novo.") }] });
        if (ok) { await api.untrust(c.address); toast(t("Confiança removida.")); load(); }
      }),
    }))),
  ];
}

// ---------- Moldura ----------

const VIEWS = [
  { id: "connections", title: "Conexões", icon: "screen-share" },
  { id: "certificates", title: "Certificados", icon: "certificate" },
];

function renderNav() {
  const counts = { connections: profiles.length, certificates: trusted.length };
  clear($("nav"), h("div", { class: "nav-group" }, VIEWS.map((v) =>
    h("button", { class: "nav-item", "aria-current": v.id === view ? "page" : null, onclick: () => navigate(v.id) },
      icon(v.icon, 18), h("span", {}, t(v.title)), counts[v.id] ? h("span", { class: "count muted-count" }, String(counts[v.id])) : null))));
  const live = profiles.filter((p) => p.session).length;
  clear($("keyring-chip"), h("span", { class: "lead" }, icon("key", 17)),
    h("div", {}, h("strong", {}, t("Chaveiro do GNOME")), h("span", {}, live ? t("{n} sessão aberta · senhas protegidas", { n: live }) : t("Senhas protegidas, nunca em arquivo"))));
}

function renderHeader() {
  if (view !== "connections") { clear($("header-actions"), h("span", { class: "header-sep" })); return; }
  const search = h("input", { class: "input", placeholder: t("Buscar conexões"), "aria-label": t("Buscar conexões") });
  search.id = "filter";
  search.value = filter;
  search.addEventListener("input", () => { filter = search.value; renderPage(); });
  const lay = segmented([{ id: "grid", icon: "grid", label: "" }, { id: "list", icon: "list-all", label: "" }], layout, (v) => { layout = v; renderPage(); });
  lay.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-label", i ? t("Lista") : t("Grade")));
  clear($("header-actions"),
    h("div", { class: "input-icon header-filter" }, icon("search", 15), search),
    lay,
    button(t("Nova conexão"), { kind: "primary", icon: "plus", onClick: () => openProfile(), title: "Ctrl N" }),
    h("span", { class: "header-sep" }));
}

function renderPage() {
  clear($("page"), view === "connections" ? renderConnections() : renderCertificates());
  $("page-crumb").textContent = view === "connections" ? t("{n} conexões", { n: profiles.length }) : t("{n} servidores", { n: trusted.length });
}

function navigate(id) {
  view = id;
  $("page-title").textContent = t(VIEWS.find((v) => v.id === id).title);
  renderNav(); renderHeader(); renderPage();
  $("page").classList.remove("enter"); void $("page").offsetWidth; $("page").classList.add("enter");
}

async function load() {
  [profiles, trusted] = await Promise.all([api.list(), api.trusted()]);
  renderNav(); renderPage();
}

function openMainMenu(anchor) {
  const pop = popover(anchor, [
    menuItem("plus", t("Nova conexão"), () => { pop.close(); openProfile(); }, "Ctrl N"),
    menuItem("certificate", t("Certificados confiáveis"), () => { pop.close(); navigate("certificates"); }),
    h("hr"),
    menuItem("keyboard", t("Atalhos de teclado"), () => { pop.close(); openShortcuts(); }, "Ctrl ?"),
    menuItem("star", t("Sobre o Beam"), () => { pop.close(); openAbout(); }),
  ], "menu");
}

function openShortcuts() {
  const rows = [[t("Nova conexão"), "Ctrl N"], [t("Buscar"), "Ctrl K"], [t("Conectar à selecionada"), "Enter"], [t("Editar a selecionada"), "F2"], [t("Excluir a selecionada"), "Del"],
    [t("Na sessão: liberar teclado e mouse e sair da tela cheia"), "Ctrl Alt F12"], [t("Na sessão: tela cheia"), "F11"], [t("Fechar diálogo"), "Esc"]];
  sheet(t("Atalhos de teclado"), list(rows.map(([label, keys]) => h("div", { class: "list-row" }, h("div", { class: "body" }, label), h("div", { class: "suffix" }, keys.split(" ").map((k) => h("kbd", {}, k)))))), { wide: false });
}

function openAbout() {
  sheet(t("Sobre o Beam"), [
    h("div", { style: { "text-align": "center", padding: "6px 0 4px" } },
      h("div", { class: "brand-mark", style: { width: "72px", height: "72px", "border-radius": "20px", margin: "0 auto 12px" } }, icon("beam", 38)),
      h("h2", { style: { "font-size": "22px", "font-weight": "800" } }, "Beam"),
      h("p", { class: "muted" }, `${t("Cliente de área de trabalho remota (RDP)")} · ${t("protótipo")}`),
      h("p", { class: "small faint" }, "IronRDP · oo7 · Lyra OS · GPL-3.0-or-later")),
  ], { wide: false });
}

function openPalette() {
  const input = h("input", { placeholder: t("Buscar conexões ou ações…"), "aria-label": t("Buscar") });
  const listEl = h("div", { class: "palette-list", role: "listbox" });
  let results = []; let selected = 0;
  const render = () => {
    const q = normalize(input.value.trim());
    const conns = profiles.filter((p) => !q || normalize(`${p.name} ${p.host}`).includes(q)).map((p) => ({ section: t("Conectar"), lead: h("span", { class: "conn-screen", style: { "--hue": hueFor(p.name), width: "28px", height: "20px", "border-radius": "5px" } }), label: p.name, where: p.host, run: () => connect(p) }));
    const acts = [{ icon: "plus", label: t("Nova conexão"), run: () => openProfile() }, { icon: "certificate", label: t("Certificados confiáveis"), run: () => navigate("certificates") }]
      .filter((a) => !q || normalize(a.label).includes(q)).map((a) => ({ ...a, section: t("Ações") }));
    results = [...conns, ...acts];
    selected = Math.min(selected, Math.max(0, results.length - 1));
    let last = null;
    clear(listEl, results.map((r, i) => { const head = r.section !== last && h("div", { class: "palette-section" }, r.section); last = r.section;
      return [head, h("button", { class: "palette-item", "aria-selected": String(i === selected), onclick: () => { close(); r.run(); } }, r.lead ?? icon(r.icon, 17), h("span", {}, r.label), r.where && h("span", { class: "where" }, r.where))]; }));
  };
  input.addEventListener("input", () => { selected = 0; render(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); selected = Math.min(results.length - 1, selected + 1); render(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); selected = Math.max(0, selected - 1); render(); }
    else if (e.key === "Enter") { e.preventDefault(); const r = results[selected]; if (r) { close(); r.run(); } }
  });
  const close = overlay(h("div", { class: "palette", role: "dialog" }, h("div", { class: "palette-input" }, icon("search", 19), input, h("kbd", {}, "Esc")), listEl), { top: true });
  render();
  requestAnimationFrame(() => input.focus());
}

function setupWindow() {
  const make = (name, label, fn) => h("button", { class: "wc", "aria-label": label, title: label, onclick: fn }, icon(name, 13));
  $("window-controls").append(make("minus", t("Minimizar"), () => win.minimize()), make("maximize", t("Maximizar"), () => win.toggleMaximize()), make("x", t("Fechar"), () => win.close()));
  document.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || !e.target.closest("[data-drag]") || e.target.closest("button, input, select")) return;
    if (e.detail === 2) win.toggleMaximize(); else win.startDragging();
  });
  document.addEventListener("keydown", (e) => {
    if (document.querySelector(".overlay")) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "n") { e.preventDefault(); openProfile(); }
    else if (mod && (e.key === "k" || e.key === "f")) { e.preventDefault(); openPalette(); }
    else if (mod && e.key === "?") { e.preventDefault(); openShortcuts(); }
  });
}

// Sessões abertas (protótipo: a janela de sessão avisa por localStorage).
window.addEventListener("storage", (e) => {
  if (!e.key?.startsWith("beam-session:")) return;
  const host = e.key.slice("beam-session:".length);
  const p = profiles.find((x) => x.host === host);
  if (!p) return;
  if (e.newValue) sessions.set(p.id, e.newValue); else sessions.delete(p.id);
  load();
});

applyTheme();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
$("brand-mark").innerHTML = svg("beam", 15);
$("search-ic").innerHTML = svg("search", 15);
$("menu-btn").innerHTML = svg("menu", 17);
$("sidebar-toggle").innerHTML = svg("sidebar", 17);
$("search-label").textContent = t("Buscar conexões");
$("menu-btn").addEventListener("click", (e) => openMainMenu(e.currentTarget));
$("search-trigger").addEventListener("click", () => openPalette());
$("scroller").addEventListener("scroll", (e) => $("headerbar").classList.toggle("scrolled", e.target.scrollTop > 4), { passive: true });
setupWindow();
({ profiles, trusted } = initial());
navigate("connections");

// Protótipo: `?open=new|edit|first|changed|password|certs` abre a tela direto.
const demoOpen = new URLSearchParams(location.search).get("open");
({
  new: () => openProfile(),
  edit: () => openProfile(profiles[0]),
  first: () => verifyCertificate({ status: "first", address: "10.20.0.41:3390", fingerprint: "3F:A9:12:7C:88:01:DE:4B:9A:20:C3:5E:77:B1:0F:62:D4:9E:31:08:AA:5C:E2:7D:16:F3:4B:90:C8:2A:61:EE" }),
  changed: () => verifyCertificate({ status: "changed", address: "ana-notebook:3389", previous: "8C:21:F0:3A:55:9D:E7:12:4B:C6:08:7A:31:DF:92:6E:A0:5B:14:C9:73:E8:2D:66:F1:0A:B5:47:9C:83:2E:D1", fingerprint: "1E:7F:A4:C9:30:5B:82:D6:0F:E1:4A:97:23:BC:68:5D:F9:12:8E:3C:A7:46:D0:71:9B:2F:E5:84:16:C3:5A:08" }),
  password: () => askPassword(profiles[1]),
  certs: () => navigate("certificates"),
})[demoOpen]?.();
