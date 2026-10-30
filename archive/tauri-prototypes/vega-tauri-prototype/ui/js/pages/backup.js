import { api } from "../api.js";
import { startJob, running, onJobs } from "../jobs.js";
import { h, icon, clear, button, badge, segmented, row, list, section, banner, skeletonRows, confirm, toast, sheet, bytes, relative, dayLabel, time, plural, meter } from "../ui.js";

const TYPE = { pre: "Antes", post: "Depois", single: "Avulso" };

export default {
  id: "backup",
  title: "Backup",
  icon: "history",
  group: "main",
  keywords: ["snapper", "snapshot", "restic", "restaurar", "rollback"],
  sections: [
    { id: "snapshots", label: "Pontos de restauração", icon: "history", keywords: ["snapper", "snapshot", "rollback"] },
    { id: "restic", label: "Backups de arquivos (Restic)", icon: "archive", keywords: ["restic", "copia", "nas"] },
  ],

  render(ctx) {
    let tab = ctx.sub === "restic" ? "restic" : "snapshots";
    const body = h("div", {}, skeletonRows(4));
    let snaps = [];
    let restic = null;

    // ---------- Pontos de restauração ----------
    async function create() {
      const input = h("input", { class: "input", placeholder: "Ex.: antes de mexer no GRUB", "aria-label": "Descrição" });
      input.style.width = "100%";
      const important = h("input", { type: "checkbox", class: "check" });
      important.checked = true;
      const ok = await confirm({
        title: "Criar ponto de restauração",
        text: "Salva o estado do sistema (não dos seus arquivos pessoais). Leva poucos segundos e ocupa espaço só conforme o sistema muda.",
        ic: "history",
        extra: h("div", { style: { display: "flex", "flex-direction": "column", gap: "12px" } }, input,
          h("label", { class: "row-flex small" }, important, "Manter até eu apagar (não entra na limpeza automática)")),
        confirmLabel: "Criar",
      });
      if (!ok) return;
      const number = Math.max(...snaps.map((s) => s.number)) + 1;
      snaps.unshift({ number, type: "single", date: new Date().toISOString(), description: input.value.trim() || "Ponto de restauração manual", important: important.checked, user: true, cleanup: "" });
      draw();
      toast(`Ponto de restauração #${number} criado`);
    }

    async function restore(s) {
      const ok = await confirm({
        title: `Voltar ao ponto #${s.number}?`,
        text: s.description,
        ic: "restart",
        tone: "warn",
        facts: [
          { icon: "history", text: "O estado atual é guardado antes, então dá para desfazer a restauração." },
          { icon: "power", warn: true, text: "O computador reinicia já no estado escolhido." },
          { icon: "info", text: "Arquivos em /home não são alterados." },
        ],
        confirmLabel: "Restaurar e reiniciar",
        confirmKind: "primary",
      });
      if (ok) toast("Restauração agendada para o próximo boot (simulado)", { ic: "info" });
    }

    async function remove(s) {
      const ok = await confirm({ title: `Apagar o ponto #${s.number}?`, text: "Isso não pode ser desfeito.", ic: "trash", tone: "danger", confirmLabel: "Apagar", confirmKind: "danger" });
      if (!ok) return;
      snaps = snaps.filter((x) => x !== s && x.pre !== s.number && x.number !== s.pre);
      draw();
      toast(`Ponto #${s.number} apagado`);
    }

    function details(s) {
      const pair = s.type === "post" ? snaps.find((x) => x.number === s.pre) : null;
      sheet(`Ponto de restauração #${s.number}`, [
        h("dl", { class: "kv card pad" },
          h("dt", {}, "Descrição"), h("dd", {}, s.description),
          h("dt", {}, "Criado"), h("dd", {}, `${dayLabel(s.date)} às ${time(s.date)}`),
          h("dt", {}, "Tipo"), h("dd", {}, pair ? `Depois (par de #${pair.number})` : TYPE[s.type]),
          h("dt", {}, "Limpeza"), h("dd", {}, s.cleanup || "Manual"),
          h("dt", {}, "Espaço exclusivo"), h("dd", {}, bytes(s.size ?? 0))),
        pair && section("Alterações entre #" + pair.number + " e #" + s.number, {}, list(
          row({ icon: "plus", tint: "green", title: "beam 1.3.0", subtitle: "/usr/bin/beam, /usr/share/applications/org.lyraos.Beam.desktop…" }),
          row({ icon: "plus", tint: "green", title: "libironrdp 0.9.1", subtitle: "/usr/lib64/libironrdp.so.0" }),
          row({ icon: "refresh", tint: "tint", title: "/etc/zypp/repos.d", subtitle: "1 arquivo alterado" }))),
        h("div", { class: "row-flex", style: { "justify-content": "flex-end" } },
          !s.important && button("Apagar", { kind: "danger-soft", icon: "trash", onClick: () => remove(s) }),
          button("Restaurar…", { kind: "primary", icon: "restart", onClick: () => restore(s) })),
      ]);
    }

    function drawSnapshots() {
      // Pares pré/pós viram um único item, como o usuário pensa neles.
      const hidden = new Set(snaps.filter((s) => s.type === "post").map((s) => s.pre));
      const items = snaps.filter((s) => !hidden.has(s.number));
      const byDay = new Map();
      for (const s of items) {
        const key = dayLabel(s.date);
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(s);
      }
      const used = 18.2 * 1024 ** 3;
      return h("div", {},
        h("div", { class: "grid c3" },
          h("div", { class: "card stat" }, h("div", { class: "stat-head" }, icon("history", 16), "Pontos guardados"), h("div", { class: "stat-value" }, String(snaps.length)), h("div", { class: "stat-foot" }, `Mais antigo ${relative(snaps.at(-1).date)}`)),
          h("div", { class: "card stat" }, h("div", { class: "stat-head" }, icon("disk", 16), "Espaço usado"), h("div", { class: "stat-value" }, bytes(used)), meter(used / (60 * 1024 ** 3)), h("div", { class: "stat-foot" }, "Limite da limpeza automática: 60 GiB")),
          h("div", { class: "card stat" }, h("div", { class: "stat-head" }, icon("clock", 16), "Automático"), h("div", { class: "stat-value", style: { "font-size": "19px" } }, "Diário + a cada mudança"), h("div", { class: "stat-foot" }, "Snapper · btrfs"))),
        section("Linha do tempo", { actions: button("Criar ponto", { kind: "primary", size: "sm", icon: "plus", onClick: create }) },
          h("div", { class: "timeline" }, [...byDay].map(([day, list]) => [
            h("div", { class: "tl-day" }, day),
            list.map((s) => {
              const pair = s.type === "post";
              return h("div", { class: `tl-item ${s.important ? "important" : ""}`.trim() },
                h("button", { class: "card interactive tl-card", onclick: () => details(s) },
                  h("div", { class: "spacer" },
                    h("div", { class: "row-flex" }, h("strong", {}, s.description), s.user && badge("Manual", "accent"), s.important && badge("Protegido", "outline", "lock")),
                    h("div", { class: "row-flex small muted" }, time(s.date), pair && h("span", { class: "tl-pair" }, "· antes ", h("span", { class: "mono" }, `#${s.pre}`), " → depois ", h("span", { class: "mono" }, `#${s.number}`)), !pair && h("span", { class: "num" }, `#${s.number}`))),
                  s.size > 0 && h("span", { class: "small faint hide-narrow" }, bytes(s.size)),
                  icon("chevron-right", 16, "ic faint")));
            }),
          ]))));
    }

    // ---------- Restic ----------
    function drawRestic() {
      const job = running("backup");
      return h("div", {},
        restic.configs.some((c) => c.status !== "ok") && banner("warn", "alert", "Um backup precisa de atenção", restic.configs.find((c) => c.status !== "ok").message, button("Tentar agora", { onClick: () => run(restic.configs.find((c) => c.status !== "ok")) })),
        section("Planos de backup", { actions: button("Novo plano", { size: "sm", icon: "plus", onClick: () => toast("Assistente de novo plano (não incluído no protótipo)", { ic: "info" }) }) },
          h("div", { class: "grid c2" }, restic.configs.map((c) =>
            h("div", { class: "card pad", style: { display: "flex", "flex-direction": "column", gap: "14px" } },
              h("div", { class: "row-flex" },
                h("span", { class: `lead`, style: { width: "40px", height: "40px", "border-radius": "11px", display: "grid", "place-items": "center", background: c.status === "ok" ? "var(--green-bg)" : "var(--yellow-bg)", color: c.status === "ok" ? "var(--green)" : "var(--yellow)" } }, icon("archive", 20)),
                h("div", { class: "spacer" }, h("strong", {}, c.name), h("div", { class: "small muted mono" }, c.source)),
                badge(c.status === "ok" ? "Em dia" : "Atenção", c.status === "ok" ? "green" : "yellow")),
              h("dl", { class: "kv" },
                h("dt", {}, "Destino"), h("dd", { class: "mono", title: c.target }, c.target),
                h("dt", {}, "Agenda"), h("dd", {}, c.schedule),
                h("dt", {}, "Retenção"), h("dd", {}, c.retention),
                h("dt", {}, "Último"), h("dd", {}, relative(c.last)),
                h("dt", {}, "Tamanho"), h("dd", {}, `${bytes(c.size)} · ${plural(c.count, "cópia", "cópias")}`)),
              job?.title.includes(c.name) ? h("div", {}, meter(job.percent / 100), h("div", { class: "small muted", style: { "margin-top": "6px" } }, job.step))
                : h("div", { class: "row-flex" }, button("Fazer backup agora", { kind: "primary", size: "sm", icon: "play", onClick: () => run(c) }), button("Restaurar arquivos…", { size: "sm", onClick: () => toast("Navegador de cópias (não incluído no protótipo)", { ic: "info" }) })))))));
    }

    async function run(config) {
      await startJob("backup", `Backup: ${config.name}`, () => { config.status = "ok"; config.last = new Date().toISOString(); config.count += 1; delete config.message; draw(); });
      draw();
    }

    const tabs = segmented([{ id: "snapshots", label: "Pontos de restauração", icon: "history" }, { id: "restic", label: "Arquivos", icon: "archive" }], tab, (id) => { tab = id; draw(); });
    function draw() {
      if (!restic) return;
      clear(body, tab === "snapshots" ? drawSnapshots() : drawRestic());
    }
    ctx.cleanup(onJobs(() => { if (tab === "restic") draw(); }));
    Promise.all([api.demo("snapshots"), api.demo("restic")]).then(([s, r]) => {
      snaps = s;
      restic = r;
      draw();
      if (ctx.sub === "new") create();
    });

    return {
      el: h("div", {}, h("div", { class: "page-hero" }, h("div", {}, h("h2", {}, "Backup"), h("p", {}, "Pontos de restauração protegem o sistema; backups Restic protegem seus arquivos.")), tabs), body),
      actions: [button("Criar ponto", { icon: "plus", size: "sm", onClick: () => { tab = "snapshots"; tabs.select("snapshots"); draw(); create(); } })],
    };
  },
};
