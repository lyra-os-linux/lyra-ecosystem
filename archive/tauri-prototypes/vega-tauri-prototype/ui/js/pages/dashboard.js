import { api } from "../api.js";
import { running, onJobs } from "../jobs.js";
import { demoState, onMetrics } from "../store.js";
import { h, icon, clear, button, sparkline, meter, bytes, rate, duration, num, relative, plural, section, list, row, badge } from "../ui.js";

function greeting() {
  const hr = new Date().getHours();
  return hr < 12 ? "Bom dia" : hr < 18 ? "Boa tarde" : "Boa noite";
}

function stat(ic, title) {
  const value = h("div", { class: "stat-value" }, "—");
  const foot = h("div", { class: "stat-foot" }, " ");
  const card = h("div", { class: "card stat" }, h("div", { class: "stat-head" }, icon(ic, 16), title), value);
  return { card, value, foot };
}

export default {
  id: "dashboard",
  title: "Painel",
  icon: "grid",
  group: "main",
  keywords: ["inicio", "resumo", "saude", "status"],

  render(ctx) {
    const heroHost = h("div");
    const summaryHost = h("div", { class: "grid c2" });

    // Métricas ao vivo
    const cpu = stat("cpu", "Processador");
    const cpuSpark = sparkline();
    cpu.card.append(cpuSpark, cpu.foot);
    const mem = stat("layers", "Memória");
    const memSpark = sparkline("spark alt");
    mem.card.append(memSpark, mem.foot);
    const net = stat("wifi", "Rede");
    const netSpark = sparkline();
    net.card.append(netSpark, net.foot);
    const disk = stat("disk", "Disco do sistema");
    const diskMeter = h("div", { style: { "margin-top": "auto" } }, meter(0, { lg: true }));
    disk.card.append(diskMeter, disk.foot);
    disk.foot.style.marginTop = "0";

    ctx.cleanup(
      onMetrics((m) => {
        const last = m.last;
        cpu.value.replaceChildren(num(m.cpu.at(-1) ?? 0, 0), h("small", {}, "%"));
        cpu.foot.textContent = `Carga ${last.load.map((l) => num(l, 2)).join(" · ")}`;
        cpuSpark.update(m.cpu, 100);
        mem.value.replaceChildren(bytes(last.mem_used), h("small", {}, `de ${bytes(last.mem_total, 0)}`));
        mem.foot.textContent = last.swap_used ? `Swap em uso: ${bytes(last.swap_used)}` : "Swap sem uso";
        memSpark.update(m.mem, 100);
        const rx = m.rx.at(-1) ?? 0;
        net.value.replaceChildren(rate(rx).replace("/s", ""), h("small", {}, "/s ↓"));
        net.foot.textContent = `Envio ${rate(m.tx.at(-1) ?? 0)}`;
        netSpark.update(m.rx, Math.max(...m.rx, 50_000));
      }),
    );

    // Herói: um único estado de saúde com a próxima ação mais útil.
    const paintHero = (updates) => {
      const job = running("update");
      const pending = demoState.updatesApplied ? [] : updates;
      const security = pending.filter((u) => u.kind === "security").length;
      let card;
      if (job) {
        card = h("div", { class: "hero" },
          h("div", { class: "hero-ic" }, h("span", { class: "spinner lg" })),
          h("div", { class: "hero-body" }, h("div", { class: "eyebrow" }, "Atualizando"), h("h2", {}, `${Math.round(job.percent)}% concluído`), h("p", {}, job.step)),
          button("Acompanhar", { kind: "pill", onClick: () => ctx.navigate("software") }));
      } else if (pending.length) {
        card = h("div", { class: `hero ${security ? "attention" : ""}`.trim() },
          h("div", { class: "hero-ic" }, icon(security ? "shield" : "download", 30)),
          h("div", { class: "hero-body" },
            h("div", { class: "eyebrow" }, greeting()),
            h("h2", {}, security ? plural(security, "correção de segurança disponível", "correções de segurança disponíveis") : plural(pending.length, "atualização disponível", "atualizações disponíveis")),
            h("p", {}, `${plural(pending.length, "pacote", "pacotes")} · ${bytes(pending.reduce((s, u) => s + u.size, 0))} para baixar. Um ponto de restauração é criado antes.`)),
          h("div", { class: "row-flex" },
            button("Ver detalhes", { kind: "pill ghost", onClick: () => ctx.navigate("software") }),
            button("Atualizar agora", { kind: "pill", icon: "download", onClick: () => ctx.navigate("software", "go") })));
      } else {
        card = h("div", { class: "hero" },
          h("div", { class: "hero-ic" }, icon("shield-check", 30)),
          h("div", { class: "hero-body" }, h("div", { class: "eyebrow" }, greeting()), h("h2", {}, "Tudo em ordem"), h("p", {}, "Sistema atualizado, backups em dia e nenhum serviço com falha.")),
          button("Verificar de novo", { kind: "pill ghost", icon: "refresh", onClick: () => ctx.navigate("software") }));
      }
      clear(heroHost, card);
    };

    (async () => {
      const [o, updates, snaps, restic, services] = await Promise.all([
        api.overview(), api.demo("updates"), api.demo("snapshots"), api.demo("restic"), api.services(),
      ]);
      paintHero(updates);
      ctx.cleanup(onJobs(() => paintHero(updates)));

      const used = o.disk_used / o.disk_total;
      disk.value.replaceChildren(bytes(o.disk_total - o.disk_used, 0), h("small", {}, "livres"));
      disk.foot.textContent = `${bytes(o.disk_used, 0)} de ${bytes(o.disk_total, 0)} em uso`;
      clear(diskMeter, meter(used, { lg: true }));

      const failed = services.filter((s) => s.active === "failed");
      const lastSnap = snaps[0];
      const lastBackup = restic.configs.find((c) => c.status !== "ok") ?? restic.configs[0];

      clear(
        summaryHost,
        list(
          row({ icon: "history", tint: "tint", title: "Pontos de restauração", subtitle: `Último ${relative(lastSnap.date)} · #${lastSnap.number} ${lastSnap.description}`, chevron: true, onClick: () => ctx.navigate("backup") }),
          row({ icon: "archive", tint: lastBackup.status === "ok" ? "green" : "yellow", title: "Backup Restic", subtitle: lastBackup.status === "ok" ? `Último ${relative(lastBackup.last)}` : lastBackup.message, suffix: lastBackup.status !== "ok" && badge("Atenção", "yellow"), chevron: true, onClick: () => ctx.navigate("backup", "restic") }),
          row({ icon: "cog", tint: failed.length ? "red" : "green", title: "Serviços", subtitle: failed.length ? `${plural(failed.length, "serviço falhou", "serviços falharam")}: ${failed.map((f) => f.unit).join(", ")}` : "Nenhuma falha", suffix: failed.length > 0 && badge(String(failed.length), "red"), chevron: true, onClick: () => ctx.navigate("services", "failed") }),
        ),
        h("div", { class: "card pad" },
          h("dl", { class: "kv" },
            h("dt", {}, "Sistema"), h("dd", { title: o.os_name }, o.os_name),
            h("dt", {}, "Kernel"), h("dd", { class: "mono", title: o.kernel }, o.kernel),
            h("dt", {}, "Processador"), h("dd", { title: o.cpu_model }, o.cpu_model),
            h("dt", {}, "Memória"), h("dd", {}, bytes(o.mem_total, 0)),
            h("dt", {}, "Ligado há"), h("dd", {}, duration(o.uptime_secs)),
          )),
      );
    })();

    const quick = (ic, title, text, onClick) =>
      h("button", { class: "card interactive quick", onclick: onClick }, h("span", { class: "q-ic" }, icon(ic, 19)), h("strong", {}, title), h("span", {}, text));

    const el = h(
      "div",
      {},
      heroHost,
      section("Agora", { sub: "ao vivo" }, h("div", { class: "grid c4" }, cpu.card, mem.card, net.card, disk.card)),
      section("Resumo", {}, summaryHost),
      section("Atalhos", {}, h("div", { class: "grid c4" },
        quick("history", "Ponto de restauração", "Salvar o estado atual", () => ctx.navigate("backup", "new")),
        quick("monitor", "Driver NVIDIA", "Instalação qualificada", () => ctx.navigate("hardware", "nvidia")),
        quick("shield", "Firewall", "Serviços e portas", () => ctx.navigate("network", "firewall")),
        quick("palette", "Layout do desktop", "Perfis Lyra, Ubuntu…", () => ctx.navigate("personalization")),
      )),
    );
    return { el };
  },
};
