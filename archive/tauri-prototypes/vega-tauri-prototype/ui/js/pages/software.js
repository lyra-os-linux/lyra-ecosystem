import { api } from "../api.js";
import { startJob, running, onJobs } from "../jobs.js";
import { demoState, setBadge } from "../store.js";
import { h, icon, clear, button, iconButton, badge, toggle, segmented, row, list, section, banner, empty, skeletonRows, confirm, toast, sheet, tile, bytes, plural, normalize } from "../ui.js";

const KIND = {
  security: { label: "Segurança", color: "red" },
  recommended: { label: "Recomendada", color: "accent" },
  optional: { label: "Opcional", color: "" },
};
const UPDATE_STEPS = ["Criando ponto de restauração", "Atualizando repositórios", "Baixando pacotes", "Verificando assinaturas", "Instalando", "Finalizando"];

function jobCard(job, steps) {
  const idx = Math.max(0, steps.indexOf(job.step));
  return h(
    "div",
    { class: "card job-card" },
    h("div", { class: "job-head" },
      h("span", { class: "lead" }, h("span", { class: "spinner" })),
      h("div", { class: "spacer" }, h("strong", {}, job.title), h("div", { class: "small muted" }, `${job.step} · etapa ${idx + 1} de ${steps.length}`)),
      h("span", { class: "percent" }, `${Math.round(job.percent)}%`)),
    h("div", { class: "steps" }, steps.map((_, i) => h("i", { class: i < idx ? "done" : i === idx ? "now" : "" }))),
    h("div", { class: "job-log" }, job.log.slice(-6).map((l) => h("div", {}, l))),
    h("p", { class: "small faint" }, "Pode continuar usando o computador. Fechar o Vega não interrompe a atualização: o vegad a conclui sozinho."),
  );
}

export default {
  id: "software",
  title: "Software",
  icon: "package",
  group: "main",
  keywords: ["pacotes", "zypper", "flatpak", "programas", "aplicativos"],
  sections: [
    { id: "updates", label: "Atualizações do sistema", icon: "download", keywords: ["update", "patch", "seguranca"] },
    { id: "installed", label: "Aplicativos instalados", icon: "box", keywords: ["remover", "desinstalar", "flatpak"] },
    { id: "repos", label: "Repositórios", icon: "database", keywords: ["repo", "packman", "obs", "fontes"] },
  ],

  render(ctx) {
    let tab = ["installed", "repos"].includes(ctx.sub) ? ctx.sub : "updates";
    const body = h("div");
    const data = {};
    const tabs = segmented(
      [{ id: "updates", label: "Atualizações", icon: "download" }, { id: "installed", label: "Instalados", icon: "box" }, { id: "repos", label: "Repositórios", icon: "database" }],
      tab,
      (id) => { tab = id; draw(); },
    );

    // ---------- Atualizações ----------
    const selected = new Set();
    let filter = "all";
    const expanded = new Set();

    async function runUpdate(items) {
      const total = items.reduce((s, u) => s + u.size, 0);
      const reboot = items.some((u) => u.reboot);
      const ok = await confirm({
        title: `Instalar ${plural(items.length, "atualização", "atualizações")}?`,
        text: `${bytes(total)} serão baixados dos repositórios configurados.`,
        ic: "download",
        facts: [
          { icon: "history", text: "Um ponto de restauração é criado antes e outro depois. Dá para voltar pelo menu de boot." },
          { icon: "lock", text: "A senha de administrador será pedida uma vez (polkit)." },
          reboot && { icon: "power", warn: true, text: "Inclui um novo kernel: será preciso reiniciar para usá-lo." },
        ].filter(Boolean),
        confirmLabel: "Atualizar",
      });
      if (!ok) return;
      await startJob("update", "Atualização do sistema", () => {
        demoState.updatesApplied = true;
        demoState.rebootPending = reboot;
        setBadge("software", { value: 0 });
      });
      draw();
    }

    function drawUpdates() {
      const job = running("update");
      if (job) return jobCard(job, UPDATE_STEPS);

      if (demoState.updatesApplied) {
        return h("div", {},
          demoState.rebootPending && banner("warn", "power", "Reinicie para concluir", "O kernel 6.12.0-160100.9 só passa a valer depois de reiniciar.", button("Reiniciar…", { onClick: () => toast("Reinício simulado", { ic: "info" }) })),
          empty("check-circle", "Sistema atualizado", "Todos os pacotes estão na versão mais recente. O Vega verifica de novo a cada 6 horas.", button("Verificar agora", { icon: "refresh", onClick: refresh }), "green"));
      }

      const updates = data.updates;
      const visible = updates.filter((u) => filter === "all" || u.kind === filter);
      const counts = Object.fromEntries(Object.keys(KIND).map((k) => [k, updates.filter((u) => u.kind === k).length]));
      const footer = h("div", { class: "list-footer" });
      const paintFooter = () => {
        const items = updates.filter((u) => selected.has(u.name));
        clear(footer,
          h("span", {}, `${plural(items.length, "selecionada", "selecionadas")} · ${bytes(items.reduce((s, u) => s + u.size, 0))}`),
          h("span", { class: "spacer" }),
          button("Atualizar selecionadas", { kind: "primary sm", disabled: !items.length, onClick: () => runUpdate(items) }));
      };

      const rows = visible.flatMap((u) => {
        const check = h("input", { type: "checkbox", class: "check", "aria-label": `Selecionar ${u.name}` });
        check.checked = selected.has(u.name);
        check.addEventListener("click", (e) => e.stopPropagation());
        check.addEventListener("change", () => { check.checked ? selected.add(u.name) : selected.delete(u.name); paintFooter(); });
        const open = expanded.has(u.name);
        const r = h("div", { class: "list-row clickable", "aria-expanded": String(open), tabindex: "0", role: "button",
          onclick: () => { open ? expanded.delete(u.name) : expanded.add(u.name); draw(); },
          onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } } },
          check,
          h("span", { class: `kind-dot ${u.kind}`, title: KIND[u.kind].label }),
          h("div", { class: "body" },
            h("div", { class: "title" }, u.name),
            h("div", { class: "version-diff" }, u.from, icon("chevron-right", 12), h("b", {}, u.to))),
          h("div", { class: "suffix" },
            u.reboot && badge("Reinício", "yellow", "power"),
            u.kind === "security" && badge("Segurança", "red", "shield"),
            h("span", { class: "nowrap hide-narrow" }, bytes(u.size)),
            icon("chevron-right", 16, "ic chev")));
        return [r, open && h("div", { class: "list-detail" }, h("p", {}, u.summary), h("p", { class: "small faint", style: { "margin-top": "6px" } }, `Repositório ${u.repo} · ${bytes(u.size)}`))];
      });
      paintFooter();

      const security = counts.security;
      return h("div", {},
        security > 0 && banner("danger", "shield", `${plural(security, "correção de segurança", "correções de segurança")}`, "Recomendamos instalar hoje. As demais podem esperar.", button(`Instalar só segurança`, { onClick: () => runUpdate(updates.filter((u) => u.kind === "security")) })),
        section("Pacotes do sistema", {
          sub: plural(updates.length, "atualização", "atualizações"),
          actions: [
            segmented([{ id: "all", label: "Todas", count: updates.length }, { id: "security", label: "Segurança", count: counts.security }, { id: "recommended", label: "Recomendadas", count: counts.recommended }, { id: "optional", label: "Opcionais", count: counts.optional }], filter, (id) => { filter = id; draw(); }),
          ],
        }, h("div", { class: "list" }, rows, footer)),
        section("Flatpak", { sub: plural(data.flatpak.length, "aplicativo", "aplicativos"), actions: button("Atualizar Flatpaks", { size: "sm", icon: "download", onClick: () => toast("Flatpaks atualizados (simulado)") }) },
          list(data.flatpak.map((f) => row({ lead: tile(f.name), title: f.name, subtitle: h("span", { class: "version-diff" }, f.from, icon("chevron-right", 12), h("b", {}, f.to)), suffix: h("span", { class: "hide-narrow" }, bytes(f.size)) })))),
      );
    }

    // ---------- Instalados ----------
    let query = "";
    let source = "all";
    function drawInstalled() {
      const search = h("input", { class: "input", placeholder: "Filtrar aplicativos", value: query, "aria-label": "Filtrar aplicativos" });
      const results = h("div");
      const paint = () => {
        const q = normalize(query);
        const items = data.installed.filter((a) => (source === "all" || a.source === source) && (!q || normalize(`${a.name} ${a.id} ${a.category}`).includes(q)));
        clear(results, items.length === 0
          ? empty("search", "Nenhum aplicativo encontrado", "Tente outro termo ou mude a origem.")
          : list(items.map((a) => row({
              lead: tile(a.name),
              title: a.name,
              subtitle: `${a.category} · ${a.version} · ${bytes(a.size)}`,
              suffix: [badge(a.source === "flatpak" ? "Flatpak" : "RPM", "outline"), button("Remover", { kind: "danger-soft", size: "sm", onClick: () => remove(a) })],
            }))));
      };
      const remove = async (app) => {
        const ok = await confirm({ title: `Remover ${app.name}?`, text: "Os arquivos pessoais e as configurações do aplicativo ficam preservados.", ic: "trash", tone: "danger", confirmLabel: "Remover", confirmKind: "danger",
          facts: [{ icon: "history", text: app.source === "flatpak" ? "Flatpak: nada no sistema muda." : "Um ponto de restauração é criado antes." }] });
        if (!ok) return;
        const index = data.installed.indexOf(app);
        data.installed.splice(index, 1);
        paint();
        toast(`${app.name} removido`, { action: "Desfazer", onAction: () => { data.installed.splice(index, 0, app); paint(); } });
      };
      search.addEventListener("input", () => { query = search.value; paint(); });
      paint();
      return h("div", {},
        h("div", { class: "toolbar" },
          h("label", { class: "input-icon" }, icon("search", 15), search),
          segmented([{ id: "all", label: "Todos" }, { id: "zypper", label: "RPM" }, { id: "flatpak", label: "Flatpak" }], source, (id) => { source = id; paint(); }),
          h("span", { class: "spacer" }),
          h("span", { class: "small faint" }, plural(data.installed.length, "aplicativo", "aplicativos"))),
        results);
    }

    // ---------- Repositórios ----------
    function drawRepos() {
      const rows = data.repos.map((r) => row({
        icon: r.official ? "shield-check" : "globe",
        tint: r.official ? "tint" : "",
        title: h("span", { class: "row-flex" }, r.name, !r.official && badge("Terceiros", "yellow")),
        subtitle: h("span", { class: "mono" }, r.url),
        suffix: [h("span", { class: "hide-narrow", title: "Prioridade" }, `P${r.priority}`), toggle(r.enabled, (on, input) => {
          r.enabled = on;
          toast(`${r.name} ${on ? "ativado" : "desativado"}`, { action: "Desfazer", onAction: () => { r.enabled = !on; input.checked = !on; } });
        }, `Ativar ${r.name}`)],
      }));
      return h("div", {},
        section("Fontes de software", { sub: plural(data.repos.filter((r) => r.enabled).length, "ativa", "ativas"), actions: [
          button("Limpar cache", { size: "sm", onClick: () => toast("Cache do Zypper limpo: 412 MiB liberados") }),
          button("Adicionar", { size: "sm", kind: "primary", icon: "plus", onClick: addRepo }),
        ] }, list(rows)),
        h("p", { class: "small faint", style: { margin: "12px 4px" } }, "Repositórios de terceiros podem trocar pacotes do sistema. O Vega pede para confiar na chave GPG antes de usar um repositório novo."));
    }
    function addRepo() {
      const alias = h("input", { class: "input", placeholder: "packman" });
      const url = h("input", { class: "input", placeholder: "https://…" });
      const close = sheet("Adicionar repositório", [
        h("label", { class: "pref-group" }, h("h4", {}, "Nome curto"), alias),
        h("label", { class: "pref-group" }, h("h4", {}, "Endereço"), url),
        banner("warn", "alert", "Confira a origem", "Pacotes de repositórios de terceiros não passam pela qualificação do Lyra."),
        h("div", { class: "row-flex", style: { "justify-content": "flex-end" } }, button("Cancelar", { onClick: () => close() }), button("Adicionar", { kind: "primary", onClick: () => {
          if (!alias.value.trim() || !/^https?:\/\//.test(url.value.trim())) { toast("Informe um nome e um endereço http(s)", { ic: "alert" }); return; }
          data.repos.push({ alias: alias.value, name: alias.value, url: url.value, enabled: true, priority: 99, official: false });
          close(); draw(); toast(`Repositório ${alias.value} adicionado`);
        } })),
      ], { wide: false });
      requestAnimationFrame(() => alias.focus());
    }

    function draw() {
      if (!data.updates) return clear(body, skeletonRows(5));
      clear(body, tab === "updates" ? drawUpdates() : tab === "installed" ? drawInstalled() : drawRepos());
    }

    async function refresh() {
      clear(body, skeletonRows(5));
      await new Promise((r) => setTimeout(r, 700));
      demoState.updatesApplied = false;
      draw();
    }

    ctx.cleanup(onJobs(() => { if (tab === "updates") draw(); }));
    draw();
    Promise.all([api.demo("updates"), api.demo("flatpak_updates"), api.demo("installed"), api.demo("repos")]).then(([u, f, i, r]) => {
      Object.assign(data, { updates: u, flatpak: f, installed: i, repos: r });
      u.filter((x) => x.kind !== "optional").forEach((x) => selected.add(x.name));
      draw();
      if (ctx.sub === "go" && !demoState.updatesApplied && !running("update")) runUpdate(u);
    });

    const el = h("div", {},
      h("div", { class: "page-hero" }, h("div", {}, h("h2", {}, "Software"), h("p", {}, "Atualizações, aplicativos e repositórios. Pacotes do sistema via Zypper e aplicativos via Flatpak, num lugar só.")), tabs),
      body);
    return { el, actions: [iconButton("refresh", "Verificar atualizações (F5)", refresh)] };
  },
};
