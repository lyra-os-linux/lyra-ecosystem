import { api } from "../api.js";
import { onMetrics } from "../store.js";
import { h, icon, clear, sparkline, bytes, rate, num, confirm, toast, normalize, meter, segmented } from "../ui.js";

const COLUMNS = [
  { id: "name", label: "Processo" },
  { id: "user", label: "Usuário", cls: "hide-narrow" },
  { id: "pid", label: "PID", num: true, cls: "hide-narrow" },
  { id: "cpu", label: "CPU", num: true },
  { id: "rss", label: "Memória", num: true },
];

export default {
  id: "monitor",
  title: "Monitor do Sistema",
  icon: "activity",
  group: "system",
  keywords: ["processos", "cpu", "memoria", "desempenho", "matar", "top"],

  render(ctx) {
    const chartCard = (title, cls) => {
      const value = h("strong", { style: { "font-size": "20px", "font-variant-numeric": "tabular-nums" } }, "—");
      const extra = h("span", { class: "small faint" });
      const chart = sparkline(`chart ${cls}`, { width: 400, height: 120, gridLines: 3 });
      const card = h("div", { class: "card pad", style: { display: "flex", "flex-direction": "column", gap: "10px" } },
        h("div", { class: "row-flex" }, h("span", { class: "muted small", style: { "font-weight": "600" } }, title), h("span", { class: "spacer" }), extra), value, chart);
      return { card, value, extra, chart };
    };
    const cpu = chartCard("Processador");
    const mem = chartCard("Memória", "alt");
    const net = chartCard("Rede (recebendo)");

    ctx.cleanup(onMetrics((m) => {
      cpu.value.textContent = `${num(m.cpu.at(-1) ?? 0, 0)}%`;
      cpu.extra.textContent = `Carga ${num(m.last.load[0], 2)}`;
      cpu.chart.update(m.cpu, 100);
      mem.value.textContent = `${bytes(m.last.mem_used)} de ${bytes(m.last.mem_total, 0)}`;
      mem.extra.textContent = `${num(m.mem.at(-1) ?? 0, 0)}%`;
      mem.chart.update(m.mem, 100);
      net.value.textContent = rate(m.rx.at(-1) ?? 0);
      net.extra.textContent = `↑ ${rate(m.tx.at(-1) ?? 0)}`;
      net.chart.update(m.rx, Math.max(...m.rx, 100_000));
    }));

    // Tabela de processos
    let processes = [];
    let sort = { key: "cpu", dir: -1 };
    let query = "";
    let scope = "all";
    let selectedPid = null;
    let paused = false;
    const tbody = h("tbody");
    const thead = h("thead");

    const paintHead = () => clear(thead, h("tr", {}, COLUMNS.map((c) => {
      const th = h("th", { class: `sortable ${c.num ? "num" : ""} ${c.cls ?? ""}`.trim(), "aria-sort": sort.key === c.id ? (sort.dir > 0 ? "ascending" : "descending") : null, tabindex: "0",
        onclick: () => { sort = { key: c.id, dir: sort.key === c.id ? -sort.dir : c.num ? -1 : 1 }; paintHead(); paint(); },
        onkeydown: (e) => { if (e.key === "Enter") e.currentTarget.click(); } }, c.label, sort.key === c.id && icon(sort.dir > 0 ? "arrow-up" : "arrow-down", 11));
      return th;
    }), h("th", {})));

    const paint = () => {
      const q = normalize(query);
      const rows = processes
        .filter((p) => (scope === "all" || (scope === "mine" ? p.user !== "root" : p.user === "root")) && (!q || normalize(`${p.name} ${p.pid}`).includes(q)))
        .sort((a, b) => (typeof a[sort.key] === "string" ? a[sort.key].localeCompare(b[sort.key]) : a[sort.key] - b[sort.key]) * sort.dir)
        .slice(0, 80);
      clear(tbody, rows.map((p) => h("tr", { "aria-selected": String(p.pid === selectedPid), onclick: () => { selectedPid = p.pid; paint(); } },
        h("td", { class: "proc-name" }, p.name),
        h("td", { class: "hide-narrow muted" }, p.user),
        h("td", { class: "num hide-narrow muted" }, p.pid),
        h("td", { class: "num" }, h("span", { class: "bar-cell" }, meter(Math.min(1, p.cpu / 100), { warnAt: 0.5, critAt: 0.8 }), `${num(p.cpu)}%`)),
        h("td", { class: "num" }, bytes(p.rss)),
        h("td", { class: "num", style: { width: "44px", padding: "4px 8px" } }, h("button", { class: "icon-btn sm", "aria-label": `Encerrar ${p.name}`, title: "Encerrar", onclick: (e) => { e.stopPropagation(); kill(p); } }, icon("x", 14))))));
    };

    async function kill(p) {
      const system = p.user === "root";
      const ok = await confirm({
        title: `Encerrar ${p.name}?`,
        text: system ? "É um processo do sistema; o vegad pedirá autorização." : "Trabalho não salvo nesse aplicativo será perdido.",
        ic: "stop", tone: "danger", confirmLabel: "Encerrar", confirmKind: "danger",
        facts: [{ icon: "info", text: `PID ${p.pid} · ${bytes(p.rss)} de memória · ${num(p.cpu)}% de CPU` }],
      });
      if (!ok) return;
      processes = processes.filter((x) => x.pid !== p.pid);
      paint();
      toast(`${p.name} encerrado (simulado)`);
    }

    const load = async () => {
      if (paused) return;
      processes = await api.processes();
      paint();
    };
    paintHead();
    load();
    const timer = setInterval(load, 3000);
    ctx.cleanup(() => clearInterval(timer));

    const search = h("input", { class: "input", placeholder: "Filtrar processos", "aria-label": "Filtrar processos" });
    search.addEventListener("input", () => { query = search.value; paint(); });
    const pauseBtn = h("button", { class: "icon-btn", "aria-pressed": "false", title: "Pausar atualização", "aria-label": "Pausar atualização" }, icon("pause", 16));
    pauseBtn.addEventListener("click", () => {
      paused = !paused;
      pauseBtn.setAttribute("aria-pressed", String(paused));
      clear(pauseBtn, icon(paused ? "play" : "pause", 16));
      if (!paused) load();
    });

    return {
      el: h("div", {},
        h("div", { class: "page-hero" }, h("div", {}, h("h2", {}, "Monitor do Sistema"), h("p", {}, "Uso em tempo real e processos. Encerrar processos de outros usuários exige autorização."))),
        h("div", { class: "grid c3" }, cpu.card, mem.card, net.card),
        h("section", { class: "section" },
          h("div", { class: "toolbar" },
            h("label", { class: "input-icon" }, icon("search", 15), search),
            segmented([{ id: "all", label: "Todos" }, { id: "mine", label: "Meus" }, { id: "system", label: "Sistema" }], scope, (id) => { scope = id; paint(); }),
            h("span", { class: "spacer" }),
            pauseBtn),
          h("div", { class: "table-wrap" }, h("table", { class: "table" }, thead, tbody)))),
    };
  },
};
