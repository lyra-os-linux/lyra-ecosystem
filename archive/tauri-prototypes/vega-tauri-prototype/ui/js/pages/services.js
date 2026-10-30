import { api } from "../api.js";
import { setBadge } from "../store.js";
import { h, icon, clear, badge, segmented, skeletonRows, empty, toast, confirm, popover, menuItem, normalize } from "../ui.js";

const STATE = {
  running: { label: "Rodando", color: "green" },
  failed: { label: "Falhou", color: "red" },
  exited: { label: "Concluído", color: "" },
  dead: { label: "Parado", color: "" },
};

export default {
  id: "services",
  title: "Serviços",
  icon: "cog",
  group: "admin",
  keywords: ["systemd", "systemctl", "daemon", "unidade", "iniciar", "parar"],
  sections: [{ id: "failed", label: "Serviços com falha", icon: "alert", keywords: ["erro", "falha"] }],

  render(ctx) {
    let all = [];
    let filter = ctx.sub === "failed" ? "failed" : "active";
    let query = "";
    const results = h("div", {}, skeletonRows(6));
    const tabs = h("div");

    function act(svc, action) {
      const verbs = { start: "iniciado", stop: "parado", restart: "reiniciado", enable: "habilitado no boot", disable: "desabilitado no boot" };
      const apply = () => {
        if (action === "start" || action === "restart") Object.assign(svc, { active: "active", sub: "running" });
        if (action === "stop") Object.assign(svc, { active: "inactive", sub: "dead" });
        if (action === "enable") svc.enabled = "enabled";
        if (action === "disable") svc.enabled = "disabled";
        setBadge("services", { value: all.filter((s) => s.active === "failed").length, tone: "warn" });
        paint();
        toast(`${svc.unit} ${verbs[action]} (simulado)`);
      };
      if (action === "stop" && /^(NetworkManager|gdm|dbus|systemd-|vegad|polkit)/.test(svc.unit)) {
        confirm({ title: `Parar ${svc.unit}?`, text: "Este serviço é essencial: parar pode derrubar a rede ou encerrar sua sessão.", ic: "alert", tone: "danger", confirmLabel: "Parar mesmo assim", confirmKind: "danger" }).then((ok) => ok && apply());
      } else apply();
    }

    function menu(anchor, svc) {
      const running = svc.active === "active";
      const pop = popover(anchor, [
        h("div", { class: "popover-head" }, h("span", { class: "mono", style: { "font-size": "13px" } }, svc.unit)),
        running ? menuItem("restart", "Reiniciar", () => { pop.close(); act(svc, "restart"); }) : menuItem("play", "Iniciar", () => { pop.close(); act(svc, "start"); }),
        running && menuItem("stop", "Parar", () => { pop.close(); act(svc, "stop"); }),
        svc.enabled === "enabled" ? menuItem("x", "Não iniciar no boot", () => { pop.close(); act(svc, "disable"); }) : svc.enabled === "disabled" && menuItem("check", "Iniciar no boot", () => { pop.close(); act(svc, "enable"); }),
        h("hr"),
        menuItem("logs", "Ver log", () => { pop.close(); ctx.navigate("logs", svc.unit); }),
      ], "menu");
    }

    function paint() {
      const failed = all.filter((s) => s.active === "failed");
      const active = all.filter((s) => s.active === "active");
      clear(tabs, segmented([
        { id: "active", label: "Ativos", count: active.length },
        { id: "failed", label: "Com falha", count: failed.length },
        { id: "all", label: "Todos", count: all.length },
      ], filter, (id) => { filter = id; paint(); }));

      const q = normalize(query);
      const items = all
        .filter((s) => (filter === "all" || (filter === "failed" ? s.active === "failed" : s.active === "active")) && (!q || normalize(`${s.unit} ${s.description}`).includes(q)))
        .sort((a, b) => (b.active === "failed") - (a.active === "failed") || a.unit.localeCompare(b.unit));
      const shown = items.slice(0, 200);

      clear(results, items.length === 0
        ? empty(filter === "failed" ? "check-circle" : "search", filter === "failed" ? "Nenhum serviço com falha" : "Nada encontrado", filter === "failed" ? "Todos os serviços estão funcionando como esperado." : "Tente outro termo.", null, filter === "failed" ? "green" : "")
        : h("div", { class: "list" },
            shown.map((s) => {
              const state = STATE[s.sub] ?? { label: s.sub, color: "" };
              const more = h("button", { class: "icon-btn sm", "aria-label": `Ações de ${s.unit}`, title: "Ações", onclick: (e) => { e.stopPropagation(); menu(more, s); } }, icon("more", 16));
              return h("div", { class: "list-row", style: { "min-height": "52px" } },
                h("span", { class: `lead ${s.active === "failed" ? "red" : s.sub === "running" ? "green" : ""}`.trim() }, icon(s.active === "failed" ? "alert" : s.sub === "running" ? "play" : "stop", 15)),
                h("div", { class: "body" }, h("div", { class: "title mono", style: { "font-size": "13.5px" } }, s.unit.replace(/\.service$/, "")), h("div", { class: "subtitle" }, s.description)),
                h("div", { class: "suffix" },
                  h("span", { class: "hide-narrow" }, badge(s.enabled === "enabled" ? "No boot" : s.enabled === "disabled" ? "Manual" : s.enabled, "outline")),
                  badge(state.label, state.color),
                  more));
            }),
            items.length > shown.length && h("div", { class: "list-footer" }, `Mostrando ${shown.length} de ${items.length}. Refine a busca para ver os demais.`)));
    }

    api.services().then((s) => { all = s; paint(); });

    const search = h("input", { class: "input", placeholder: "Filtrar por nome ou descrição", "aria-label": "Filtrar serviços" });
    search.addEventListener("input", () => { query = search.value; paint(); });

    return {
      el: h("div", {},
        h("div", { class: "page-hero" }, h("div", {}, h("h2", {}, "Serviços"), h("p", {}, "Unidades do systemd. Iniciar, parar e mudar o boot pede autorização ao vegad."))),
        h("div", { class: "toolbar" }, h("label", { class: "input-icon" }, icon("search", 15), search), tabs),
        results),
    };
  },
};
