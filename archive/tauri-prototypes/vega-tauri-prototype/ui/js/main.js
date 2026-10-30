import { api, native, win } from "./api.js";
import { svg } from "./icons.js";
import { mountJobsButton } from "./jobs.js";
import { pages, groups } from "./pages/index.js";
import { badges, onBadges, prefs, savePrefs, setBadge, startSampling } from "./store.js";
import { h, icon, clear, overlay, popover, menuItem, sheet, segmented, normalize, duration, bytes, toast } from "./ui.js";

const $ = (id) => document.getElementById(id);
const byId = new Map(pages.map((p) => [p.id, p]));

// ---------- Tema e cor de destaque ----------

export const ACCENTS = {
  blue: "#3584e4", teal: "#2190a4", green: "#3a944a", yellow: "#c88800", orange: "#ed5b00",
  red: "#e62d42", pink: "#d56199", purple: "#9141ac", slate: "#6f8396",
};
let system = { dark: false, accent: "blue" };

function applyTheme() {
  const dark = prefs.theme === "dark" || (prefs.theme === "system" && system.dark);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.density = prefs.density;
  const accentName = prefs.accent === "system" ? system.accent : prefs.accent;
  let accent = ACCENTS[accentName] ?? ACCENTS.blue;
  // No escuro o libadwaita clareia o destaque para manter o contraste.
  if (dark) accent = `color-mix(in srgb, ${accent} 78%, #fff)`;
  document.documentElement.style.setProperty("--accent", accent);
}

async function loadSystemPrefs() {
  const p = await api.prefs();
  system = { dark: p.color_scheme === "prefer-dark", accent: p.accent || "blue" };
  applyTheme();
}
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (!native) loadSystemPrefs();
});

// ---------- Navegação ----------

let current = null;

function navItem(page) {
  const count = badges[page.id];
  return h(
    "button",
    { class: "nav-item", "aria-current": current?.page.id === page.id ? "page" : null, onclick: () => navigate(page.id), dataset: { page: page.id } },
    icon(page.icon, 18),
    h("span", {}, page.title),
    count?.value ? h("span", { class: `count ${count.tone ?? ""}`.trim() }, count.value) : null,
  );
}

function renderNav() {
  clear(
    $("nav"),
    groups.map((g) =>
      h("div", { class: "nav-group" }, g.title && h("div", { class: "nav-group-title" }, g.title), pages.filter((p) => p.group === g.id).map(navItem)),
    ),
  );
}
onBadges(renderNav);

export function navigate(id, sub) {
  const hash = `#/${id}${sub ? `/${sub}` : ""}`;
  if (location.hash === hash) route();
  else location.hash = hash;
}

function route() {
  const [, id = prefs.start, sub] = location.hash.split("/");
  const page = byId.get(id) ?? byId.get("dashboard");
  current?.cleanups.forEach((fn) => fn());

  const cleanups = [];
  current = { page, cleanups };
  const ctx = {
    sub,
    navigate,
    cleanup: (fn) => cleanups.push(fn),
    setCrumb: (text) => ($("page-crumb").textContent = text ?? ""),
  };
  $("page-title").textContent = page.title;
  $("page-crumb").textContent = "";
  document.title = `${page.title} — Vega`;

  const host = $("page");
  host.classList.remove("enter");
  const view = page.render(ctx);
  clear(host, view.el);
  clear($("header-actions"), view.actions ?? []);
  void host.offsetWidth;
  host.classList.add("enter");
  $("scroller").scrollTop = 0;
  renderNav();
  closeSidebar();

  if (sub) requestAnimationFrame(() => document.getElementById(`sec-${sub}`)?.scrollIntoView({ block: "start" }));
}
window.addEventListener("hashchange", route);

// ---------- Barra lateral adaptativa ----------

function openSidebar() {
  $("sidebar").classList.add("open");
  const scrim = h("div", { class: "sidebar-scrim", onclick: closeSidebar });
  scrim.id = "sidebar-scrim";
  document.body.append(scrim);
  $("sidebar").querySelector("[aria-current=page]")?.focus();
}
function closeSidebar() {
  $("sidebar").classList.remove("open");
  $("sidebar-scrim")?.remove();
}

// ---------- Paleta de comandos ----------

function paletteEntries() {
  const entries = [];
  for (const page of pages) {
    entries.push({ section: "Páginas", icon: page.icon, label: page.title, where: "", keys: [page.title, ...(page.keywords ?? [])], run: () => navigate(page.id) });
    for (const sec of page.sections ?? []) {
      entries.push({ section: "Configurações", icon: sec.icon ?? page.icon, label: sec.label, where: page.title, keys: [sec.label, ...(sec.keywords ?? [])], run: () => navigate(page.id, sec.id) });
    }
  }
  entries.push(
    { section: "Ações", icon: "refresh", label: "Verificar atualizações", keys: ["atualizar", "update", "zypper"], run: () => navigate("software", "updates") },
    { section: "Ações", icon: "history", label: "Criar ponto de restauração", keys: ["snapshot", "snapper", "backup"], run: () => navigate("backup", "new") },
    { section: "Ações", icon: prefs.theme === "dark" ? "sun" : "moon", label: "Alternar tema claro/escuro", keys: ["tema", "escuro", "dark", "claro"], run: toggleTheme },
    { section: "Ações", icon: "cog", label: "Preferências do Vega", keys: ["preferencias", "configurar"], run: openPreferences },
    { section: "Ações", icon: "keyboard", label: "Atalhos de teclado", keys: ["atalhos", "teclado"], run: openShortcuts },
  );
  return entries;
}

function openPalette() {
  const input = h("input", { placeholder: "Buscar páginas, configurações e ações…", "aria-label": "Buscar", role: "combobox", "aria-expanded": "true", "aria-controls": "palette-list" });
  const listEl = h("div", { class: "palette-list", id: "palette-list", role: "listbox" });
  const all = paletteEntries();
  let results = [];
  let selected = 0;

  const score = (entry, q) => {
    if (!q) return entry.section === "Páginas" ? 1 : 0;
    let best = 0;
    for (const key of entry.keys) {
      const k = normalize(key);
      if (k.startsWith(q)) best = Math.max(best, 3);
      else if (k.split(/\s+/).some((w) => w.startsWith(q))) best = Math.max(best, 2);
      else if (k.includes(q)) best = Math.max(best, 1);
    }
    return best;
  };

  const render = () => {
    const q = normalize(input.value.trim());
    results = all.map((e) => ({ e, s: score(e, q) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).map((r) => r.e);
    selected = Math.min(selected, Math.max(0, results.length - 1));
    let lastSection = null;
    clear(
      listEl,
      results.length === 0
        ? h("div", { class: "empty", style: { padding: "30px" } }, h("p", {}, "Nada encontrado para “", input.value, "”"))
        : results.map((entry, i) => {
            const head = entry.section !== lastSection && h("div", { class: "palette-section" }, entry.section);
            lastSection = entry.section;
            return [
              head,
              h(
                "button",
                { class: "palette-item", role: "option", "aria-selected": String(i === selected), onclick: () => choose(i), onmousemove: () => { if (selected !== i) { selected = i; paint(); } } },
                icon(entry.icon, 17),
                h("span", {}, entry.label),
                entry.where && h("span", { class: "where" }, entry.where),
              ),
            ];
          }),
    );
  };
  const paint = () => {
    listEl.querySelectorAll(".palette-item").forEach((el, i) => el.setAttribute("aria-selected", String(i === selected)));
    listEl.querySelectorAll(".palette-item")[selected]?.scrollIntoView({ block: "nearest" });
  };
  const choose = (i) => {
    const entry = results[i];
    if (!entry) return;
    close();
    entry.run();
  };

  input.addEventListener("input", () => { selected = 0; render(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); selected = Math.min(results.length - 1, selected + 1); paint(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); selected = Math.max(0, selected - 1); paint(); }
    else if (e.key === "Enter") { e.preventDefault(); choose(selected); }
  });

  const close = overlay(
    h(
      "div",
      { class: "palette", role: "dialog", "aria-label": "Buscar no Vega" },
      h("div", { class: "palette-input" }, icon("search", 19), input, h("kbd", {}, "Esc")),
      listEl,
      h("div", { class: "palette-foot" }, h("span", {}, h("kbd", {}, "↑↓"), " navegar"), h("span", {}, h("kbd", {}, "Enter"), " abrir"), h("span", { class: "spacer" }), h("span", {}, native ? "vegad · org.lyraos.Vega1" : "Pré-visualização no navegador")),
    ),
    { top: true },
  );
  render();
  requestAnimationFrame(() => input.focus());
}

// ---------- Preferências, atalhos e sobre ----------

function toggleTheme() {
  const dark = document.documentElement.dataset.theme === "dark";
  prefs.theme = dark ? "light" : "dark";
  savePrefs();
  applyTheme();
}

function openPreferences() {
  const accents = h(
    "div",
    { class: "swatches", role: "radiogroup", "aria-label": "Cor de destaque" },
    [["system", "var(--fill-3)"], ...Object.entries(ACCENTS)].map(([name, color]) => {
      const b = h("button", { class: "swatch", role: "radio", "aria-checked": String(prefs.accent === name), "aria-label": name === "system" ? "Seguir o GNOME" : name, title: name === "system" ? "Seguir o GNOME" : name });
      b.style.background = name === "system" ? "conic-gradient(#3584e4, #3a944a, #c88800, #e62d42, #9141ac, #3584e4)" : color;
      b.addEventListener("click", () => {
        prefs.accent = name;
        savePrefs();
        applyTheme();
        accents.querySelectorAll(".swatch").forEach((s) => s.setAttribute("aria-checked", String(s === b)));
      });
      return b;
    }),
  );
  const startSelect = h("select", { class: "input", "aria-label": "Página inicial" }, pages.map((p) => h("option", { value: p.id, selected: p.id === prefs.start }, p.title)));
  startSelect.addEventListener("change", () => { prefs.start = startSelect.value; savePrefs(); });

  sheet(
    "Preferências",
    [
      h("div", { class: "pref-group" }, h("h4", {}, "Aparência"), segmented(
        [{ id: "system", label: "Sistema", icon: "monitor" }, { id: "light", label: "Claro", icon: "sun" }, { id: "dark", label: "Escuro", icon: "moon" }],
        prefs.theme,
        (id) => { prefs.theme = id; savePrefs(); applyTheme(); },
      )),
      h("div", { class: "pref-group" }, h("h4", {}, "Cor de destaque"), accents, h("p", { class: "small faint", style: { "margin-top": "8px" } }, "“Seguir o GNOME” usa a cor escolhida em Configurações › Aparência.")),
      h("div", { class: "pref-group" }, h("h4", {}, "Densidade"), segmented(
        [{ id: "comfortable", label: "Confortável" }, { id: "compact", label: "Compacta" }],
        prefs.density,
        (id) => { prefs.density = id; savePrefs(); applyTheme(); },
      )),
      h("div", { class: "pref-group" }, h("h4", {}, "Página inicial"), startSelect),
    ],
    { wide: false },
  );
}

function openShortcuts() {
  const rows = [
    ["Buscar no Vega", "Ctrl K"], ["Preferências", "Ctrl ,"], ["Alternar tema", "Ctrl Shift L"],
    ["Ir para a página 1–9", "Alt 1…9"], ["Atualizar página", "F5"], ["Atalhos de teclado", "Ctrl ?"], ["Fechar diálogo", "Esc"],
  ];
  sheet("Atalhos de teclado", h("div", { class: "list" }, rows.map(([label, keys]) => h("div", { class: "list-row" }, h("div", { class: "body" }, label), h("div", { class: "suffix" }, keys.split(" ").map((k) => h("kbd", {}, k)))))), { wide: false });
}

async function openAbout() {
  const o = await api.overview();
  const kv = [
    ["Sistema", o.os_name], ["Host", o.hostname], ["Kernel", o.kernel], ["Processador", `${o.cpu_model} (${o.cpu_threads} threads)`],
    ["Memória", bytes(o.mem_total)], ["Ligado há", duration(o.uptime_secs)], ["Interface", native ? "Tauri 2 · WebKitGTK" : "Navegador (pré-visualização)"],
  ];
  sheet("Sobre o Vega", [
    h("div", { style: { "text-align": "center", padding: "6px 0 4px" } },
      h("div", { class: "brand-mark", style: { width: "72px", height: "72px", "border-radius": "20px", margin: "0 auto 12px" }, dataset: { big: "" } }, icon("star", 38)),
      h("h2", { style: { "font-size": "22px", "font-weight": "800" } }, "Vega"),
      h("p", { class: "muted" }, "Centro de controle do Lyra OS · protótipo Tauri 0.1.0")),
    h("dl", { class: "kv card pad" }, kv.flatMap(([k, v]) => [h("dt", {}, k), h("dd", { title: v }, v)])),
    h("p", { class: "small faint", style: { "text-align": "center" } }, "GPL-3.0 · Operações privilegiadas passam pelo vegad e pelo polkit."),
  ], { wide: false });
}

function openMainMenu(anchor) {
  const pop = popover(anchor, [
    menuItem("cog", "Preferências", () => { pop.close(); openPreferences(); }, "Ctrl ,"),
    menuItem("keyboard", "Atalhos de teclado", () => { pop.close(); openShortcuts(); }, "Ctrl ?"),
    h("hr"),
    menuItem("star", "Sobre o Vega", () => { pop.close(); openAbout(); }),
  ], "menu");
}

// ---------- Janela (barra de título própria) ----------

function setupWindow() {
  const controls = $("window-controls");
  const make = (name, label, fn) => h("button", { class: "wc", "aria-label": label, title: label, onclick: fn }, icon(name, 13));
  const maxBtn = make("maximize", "Maximizar", () => win?.toggleMaximize());
  controls.append(make("minus", "Minimizar", () => win?.minimize()), maxBtn, make("x", "Fechar", () => (win ? win.close() : toast("Na pré-visualização a janela não fecha", { ic: "info" }))));

  if (!win) return;
  document.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || !e.target.closest("[data-drag]") || e.target.closest("button, input")) return;
    if (e.detail === 2) win.toggleMaximize();
    else win.startDragging();
  });
  for (const dir of ["North", "South", "East", "West", "NorthEast", "NorthWest", "SouthEast", "SouthWest"]) {
    document.body.append(h("div", { class: "resize", dataset: { dir }, onmousedown: (e) => { e.preventDefault(); win.startResizeDragging(dir); } }));
  }
  const sync = async () => {
    const max = await win.isMaximized();
    document.body.classList.toggle("maximized", max);
    clear(maxBtn, icon(max ? "restore" : "maximize", 13));
    maxBtn.title = maxBtn.ariaLabel = max ? "Restaurar" : "Maximizar";
  };
  win.onResized(sync);
  sync();
}

// ---------- Inicialização ----------

function setupShell() {
  $("brand-mark").innerHTML = svg("star", 15);
  $("search-ic").innerHTML = svg("search", 15);
  $("menu-btn").innerHTML = svg("menu", 17);
  $("sidebar-toggle").innerHTML = svg("sidebar", 17);
  $("host-avatar").innerHTML = svg("monitor", 18);
  $("menu-btn").addEventListener("click", (e) => openMainMenu(e.currentTarget));
  $("search-trigger").addEventListener("click", openPalette);
  $("sidebar-toggle").addEventListener("click", openSidebar);
  $("host-chip").addEventListener("click", openAbout);
  mountJobsButton($("jobs-btn"));

  $("scroller").addEventListener("scroll", (e) => $("headerbar").classList.toggle("scrolled", e.target.scrollTop > 4), { passive: true });

  document.addEventListener("keydown", (e) => {
    if (document.querySelector(".overlay")) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === "k" || e.key === "f")) { e.preventDefault(); openPalette(); }
    else if (mod && e.key === ",") { e.preventDefault(); openPreferences(); }
    else if (mod && e.shiftKey && e.key.toLowerCase() === "l") { e.preventDefault(); toggleTheme(); }
    else if (mod && e.key === "?") { e.preventDefault(); openShortcuts(); }
    else if (e.key === "F5") { e.preventDefault(); route(); }
    else if (e.altKey && /^[1-9]$/.test(e.key)) { e.preventDefault(); const p = pages[Number(e.key) - 1]; if (p) navigate(p.id); }
    else if (!mod && !e.altKey && e.key.length === 1 && /\S/.test(e.key) && !e.target.closest("input, textarea, select")) {
      // Digitar em qualquer lugar abre a busca, como no GNOME Settings.
      openPalette();
      requestAnimationFrame(() => {
        const input = document.querySelector(".palette-input input");
        if (input) { input.value = e.key; input.dispatchEvent(new Event("input")); }
      });
      e.preventDefault();
    }
  });
}

async function loadHost() {
  const o = await api.overview();
  $("host-name").textContent = o.hostname || "Este computador";
  $("backend-label").textContent = native ? "vegad conectado" : "Pré-visualização";
  $("backend-dot").classList.toggle("off", !native);
}

// Contadores iniciais da barra lateral.
async function loadBadges() {
  const updates = await api.demo("updates");
  setBadge("software", { value: updates.length });
  const services = await api.services();
  const failed = services.filter((s) => s.active === "failed").length;
  setBadge("services", { value: failed, tone: "warn" });
}

applyTheme();
setupShell();
setupWindow();
loadSystemPrefs();
loadHost();
loadBadges();
startSampling();
route();
