// Beam — janela de sessão (protótipo). No produto, a área remota recebe os
// quadros do IronRDP; aqui um desktop simulado mostra proporção e escala.

import { svg } from "./icons.js";
import { t } from "./i18n.js";
import { win } from "./api.js";
import { h, icon, clear, button, toast, confirm } from "./ui.js";

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const p = {
  name: q.get("name") ?? "Estação do escritório", host: q.get("host") ?? "ws-rodrigo.empresa.local", port: Number(q.get("port") ?? 3389),
  w: Number(q.get("w") ?? 1920), hgt: Number(q.get("h") ?? 1080), depth: Number(q.get("depth") ?? 32), full: q.get("full") === "1",
};
let state = q.get("state") ?? "connecting";
let captured = false;
let fullscreen = false;
const announce = (s) => { try { localStorage.setItem(`beam-session:${p.host}`, s); } catch {} };

document.title = `${p.name} — Beam`;
$("name").textContent = p.name;
$("remote").style.setProperty("--ratio", `${p.w} / ${p.hgt}`);
$("remote").tabIndex = 0;

function desktop() {
  const colors = ["#3a7bd5", "#f7b500", "#2fb5ad", "#e54d42", "#7b61ff", "#38b06a"];
  const now = new Date();
  return [
    h("div", { class: "wall" }),
    h("div", { class: "rwin" }, h("div", { class: "rtitle" }, "Explorador de Arquivos"), h("div", { class: "rbody" }, h("div", { class: "rside" }), h("div", { class: "rfiles" }, Array.from({ length: 10 }, () => h("i"))))),
    h("div", { class: "taskbar" }, colors.map((c) => h("i", { style: { "--c": c } })), h("span", { class: "clock" }, now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), h("br"), now.toLocaleDateString("pt-BR"))),
  ];
}

function renderBar() {
  $("dot").className = `status-dot ${state === "connected" ? "" : state}`.trim();
  $("meta").textContent = state === "connected" ? `${p.host}${p.port !== 3389 ? `:${p.port}` : ""} · ${p.w}×${p.hgt} · ${p.depth} bits`
    : state === "lost" ? t("Conexão perdida") : t("Conectando a {host}…", { host: p.host });
  const live = state === "connected";
  clear($("actions"),
    button(t("Ctrl+Alt+Del"), { size: "sm", icon: "keyboard", disabled: !live, title: t("Enviar Ctrl+Alt+Del"), onClick: () => toast(t("Ctrl+Alt+Del enviado."), { ic: "keyboard" }) }),
    h("button", { class: "icon-btn sm", "aria-label": fullscreen ? t("Sair da tela cheia") : t("Tela cheia"), title: `${fullscreen ? t("Sair da tela cheia") : t("Tela cheia")} (F11)`, onclick: toggleFullscreen }, icon(fullscreen ? "restore" : "maximize", 16)),
    button(t("Desconectar"), { size: "sm", kind: "danger-soft", icon: "power", onClick: disconnect }));
  $("capture").hidden = !(live && captured);
  clear($("capture"), icon("keyboard", 14), h("span", { class: "label" }, t("Teclado e mouse capturados")), h("kbd", {}, "Ctrl"), h("kbd", {}, "Alt"), h("kbd", {}, "F12"), t("libera"));
}

const STEPS = ["Conectando ao servidor", "Negociando TLS e verificando o certificado", "Autenticando (NLA)", "Ativando a sessão"];
let stepTimer;
function renderStage() {
  const remote = $("remote");
  if (!remote.childElementCount) remote.append(...desktop());
  remote.classList.toggle("blur", state !== "connected");
  remote.classList.toggle("captured", captured && state === "connected");
  const box = $("connecting");
  clearInterval(stepTimer);
  if (state === "connecting") {
    let step = 0;
    const paint = () => clear(box, h("div", { class: "connect-card", role: "status" },
      h("h2", {}, t("Conectando a {name}", { name: p.name })),
      h("p", {}, `${p.host}:${p.port}`),
      h("ul", { class: "steps" }, STEPS.map((s, i) => h("li", { class: i < step ? "done" : i === step ? "now" : "" },
        h("span", { class: "mark" }, i < step ? icon("check", 13) : i === step ? h("span", { class: "spinner" }) : null), t(s)))),
      h("div", { class: "row-flex" }, button(t("Cancelar"), { size: "sm", onClick: () => { announce(""); win.close(); window.close(); } }))));
    paint();
    stepTimer = setInterval(() => { step++; if (step >= STEPS.length) { setState("connected"); } else paint(); }, 700);
  } else if (state === "lost") {
    clear(box, h("div", { class: "connect-card lost-card", role: "alert" },
      h("div", { class: "d-ic" }, icon("alert-circle", 26)),
      h("h2", {}, t("Conexão perdida")),
      h("p", {}, t("A sessão com {host} foi interrompida. O que estava aberto no computador remoto continua lá.", { host: p.host })),
      h("div", { class: "detail" }, t("Erro de rede: conexão redefinida pelo servidor")),
      h("div", { class: "row-flex" }, button(t("Fechar"), { size: "sm", onClick: () => window.close() }), button(t("Reconectar"), { size: "sm", kind: "primary", icon: "refresh", onClick: () => setState("connecting") }))));
  } else {
    clear(box);
  }
}

function setState(s) {
  state = s;
  announce(s === "lost" ? "lost" : s);
  if (s === "connected") {
    captured = true;
    if (p.full && !fullscreen) toggleFullscreen();
    toast(t("Conectado a {name}. Ctrl+Alt+F12 libera o teclado e o mouse.", { name: p.name }), { ic: "check-circle" });
    $("remote").focus();
  }
  if (s !== "connected") captured = false;
  renderBar(); renderStage();
}

function toggleFullscreen() {
  fullscreen = !fullscreen;
  document.body.classList.toggle("fullscreen", fullscreen);
  if (fullscreen) document.documentElement.requestFullscreen?.().catch(() => {}); else document.exitFullscreen?.().catch(() => {});
  renderBar();
}

async function disconnect() {
  const ok = await confirm({ title: t("Desconectar?"), text: t("A sessão em {host} continua aberta no Windows; você pode reconectar depois.", { host: p.host }), ic: "power", confirmLabel: t("Desconectar"), confirmKind: "danger" });
  if (ok) { announce(""); win.close(); window.close(); }
}

// Captura: clicar na área remota captura; Ctrl+Alt+F12 libera e sai da tela cheia.
$("remote").addEventListener("mousedown", () => { if (state === "connected" && !captured) { captured = true; renderBar(); renderStage(); } });
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.altKey && e.key === "F12") {
    e.preventDefault(); captured = false; if (fullscreen) toggleFullscreen(); renderBar(); renderStage();
    toast(t("Teclado e mouse liberados. Clique na sessão para capturar de novo."), { ic: "keyboard" });
  } else if (e.key === "F11" && !captured) { e.preventDefault(); toggleFullscreen(); }
});
// Em tela cheia, a barra aparece ao levar o ponteiro ao topo.
document.addEventListener("mousemove", (e) => { if (fullscreen) $("bar").classList.toggle("peek", e.clientY < 8 || $("bar").matches(":hover")); });

const make = (name, label, fn) => h("button", { class: "wc", "aria-label": label, title: label, onclick: fn }, icon(name, 13));
$("window-controls").append(make("minus", t("Minimizar"), () => win.minimize()), make("maximize", t("Maximizar"), () => win.toggleMaximize()), make("x", t("Fechar"), disconnect));
document.addEventListener("mousedown", (e) => { if (e.button === 0 && e.target.closest("[data-drag]") && !e.target.closest("button")) win.startDragging(); });
window.addEventListener("beforeunload", () => announce(""));
// Protótipo: a tecla L simula queda da conexão.
document.addEventListener("keydown", (e) => { if (e.key.toLowerCase() === "l" && e.shiftKey && e.ctrlKey && state === "connected") setState("lost"); });
setState(state);
