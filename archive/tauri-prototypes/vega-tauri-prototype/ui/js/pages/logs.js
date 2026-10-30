import { api } from "../api.js";
import { h, icon, clear, button, segmented, skeletonRows, empty, normalize, toggle, plural, toast } from "../ui.js";

const LEVELS = ["Emergência", "Alerta", "Crítico", "Erro", "Aviso", "Aviso", "Info", "Depuração"];

function highlight(text, q) {
  if (!q) return text;
  const norm = normalize(text);
  const parts = [];
  let i = 0;
  let at;
  while ((at = norm.indexOf(q, i)) !== -1) {
    parts.push(text.slice(i, at), h("mark", {}, text.slice(at, at + q.length)));
    i = at + q.length;
  }
  parts.push(text.slice(i));
  return parts;
}

export default {
  id: "logs",
  title: "Log do Sistema",
  icon: "logs",
  group: "admin",
  keywords: ["journal", "journalctl", "erros", "eventos", "registro"],

  render(ctx) {
    let priority = 4;
    let query = "";
    let unit = ctx.sub ? decodeURIComponent(ctx.sub) : "";
    let entries = [];
    let follow = false;
    const results = h("div", { class: "table-wrap" }, skeletonRows(6));
    const status = h("span", { class: "small faint" });

    const paint = () => {
      const q = normalize(query);
      const items = entries.filter((e) => (!unit || e.unit === unit || e.ident === unit.replace(/\.service$/, "")) && (!q || normalize(`${e.message} ${e.ident}`).includes(q)));
      status.textContent = plural(items.length, "evento", "eventos");
      if (!items.length) return clear(results, empty("logs", "Nenhum evento", unit ? `Nada de ${unit} neste nível.` : "Ajuste os filtros para ver mais."));
      clear(results, h("div", { class: "log-list" }, items.slice(0, 400).map((e) =>
        h("div", { class: `log-row p${e.priority}`, title: `${LEVELS[e.priority]} · ${new Date(e.ts).toLocaleString("pt-BR")}` },
          h("span", { class: "t" }, new Date(e.ts).toLocaleTimeString("pt-BR")),
          h("span", { class: "lvl", "aria-label": LEVELS[e.priority] }),
          h("span", { class: "who" }, e.ident || "—"),
          h("span", { class: "msg" }, highlight(e.message, q))))));
    };

    const load = async () => {
      entries = await api.journal(800, priority);
      paint();
    };
    load();
    let timer;
    ctx.cleanup(() => clearInterval(timer));

    const search = h("input", { class: "input", placeholder: "Buscar nas mensagens", "aria-label": "Buscar nas mensagens" });
    search.addEventListener("input", () => { query = search.value; paint(); });
    const unitChip = h("span");
    const paintUnit = () => clear(unitChip, unit && h("button", { class: "btn sm", onclick: () => { unit = ""; ctx.setCrumb(""); paintUnit(); paint(); }, title: "Remover filtro" }, h("span", { class: "mono" }, unit), icon("x", 13)));
    paintUnit();
    if (unit) ctx.setCrumb(unit);

    return {
      el: h("div", {},
        h("div", { class: "page-hero" }, h("div", {}, h("h2", {}, "Log do Sistema"), h("p", {}, "Eventos do journal, do mais recente para o mais antigo."))),
        h("div", { class: "toolbar" },
          h("label", { class: "input-icon" }, icon("search", 15), search),
          segmented([{ id: 3, label: "Erros" }, { id: 4, label: "Avisos" }, { id: 6, label: "Info" }, { id: 7, label: "Tudo" }], priority, (p) => { priority = p; clear(results, skeletonRows(6)); load(); }),
          unitChip,
          h("span", { class: "spacer" }),
          status,
          h("label", { class: "row-flex small", title: "Recarregar a cada 3 segundos" }, "Acompanhar", toggle(false, (on) => {
            follow = on;
            clearInterval(timer);
            if (follow) timer = setInterval(load, 3000);
          }, "Acompanhar novos eventos"))),
        results),
      actions: [button("Exportar", { size: "sm", icon: "download", onClick: () => {
        const text = entries.map((e) => `${new Date(e.ts).toISOString()} ${e.ident}: ${e.message}`).join("\n");
        navigator.clipboard?.writeText(text);
        toast(`${plural(entries.length, "evento copiado", "eventos copiados")} para a área de transferência`);
      } })],
    };
  },
};
