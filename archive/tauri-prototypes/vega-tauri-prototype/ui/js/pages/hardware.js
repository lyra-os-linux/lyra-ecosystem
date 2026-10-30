import { api } from "../api.js";
import { startJob, running, onJobs } from "../jobs.js";
import { demoState } from "../store.js";
import { h, icon, clear, button, badge, row, list, section, banner, skeletonRows, confirm, toast, bytes, plural } from "../ui.js";

const NVIDIA_STEPS = ["Criando ponto de restauração obrigatório", "Adicionando repositório NVIDIA", "Instalando driver G06", "Verificando módulo assinado pela SUSE", "Finalizando"];

export default {
  id: "hardware",
  title: "Hardware e Kernel",
  icon: "cpu",
  group: "system",
  keywords: ["placa de video", "gpu", "driver", "nvidia", "kernel", "boot", "firmware"],
  sections: [
    { id: "nvidia", label: "Driver NVIDIA", icon: "monitor", keywords: ["nvidia", "gpu", "placa de video", "driver"] },
    { id: "kernel", label: "Kernels instalados", icon: "terminal", keywords: ["kernel", "linux", "longterm"] },
    { id: "boot", label: "Inicialização (boot)", icon: "power", keywords: ["boot", "grub", "systemd-boot", "secure boot"] },
  ],

  render(ctx) {
    const body = h("div", {}, skeletonRows(5));
    let hw, nv, kernels, available, boot;

    function nvidiaCard() {
      const job = running("nvidia");
      const gpu = hw.gpus.find((g) => g.vendor === "nvidia");
      if (!gpu) return null;
      const checks = [
        [nv.capability, "vegad oferece instalação qualificada (nvidia-official-v1)"],
        [nv.secure_boot, "Secure Boot ativo: módulo assinado pela SUSE, sem MOK manual"],
        [true, "Ponto de restauração obrigatório antes de instalar"],
      ];
      let action;
      if (job) {
        const idx = Math.max(0, NVIDIA_STEPS.indexOf(job.step));
        action = h("div", { style: { display: "flex", "flex-direction": "column", gap: "8px" } },
          h("div", { class: "row-flex small" }, h("span", { class: "spinner" }), h("strong", {}, job.step), h("span", { class: "spacer" }), `${Math.round(job.percent)}%`),
          h("div", { class: "steps" }, NVIDIA_STEPS.map((_, i) => h("i", { class: i < idx ? "done" : i === idx ? "now" : "" }))));
      } else if (demoState.nvidiaInstalled) {
        action = banner("success", "check-circle", "Driver instalado", "Reinicie para trocar o nouveau pelo driver da NVIDIA.", button("Reiniciar…", { onClick: () => toast("Reinício simulado", { ic: "info" }) }));
      } else {
        action = h("div", { class: "row-flex" },
          button("Instalar driver oficial", { kind: "primary", icon: "download", onClick: install }),
          h("span", { class: "small faint" }, `${nv.recommended} · ${nv.version}`));
      }
      return h("div", { class: "card pad", id: "sec-nvidia", style: { display: "flex", "flex-direction": "column", gap: "16px" } },
        h("div", { class: "row-flex" },
          h("span", { class: "lead", style: { width: "44px", height: "44px", "border-radius": "12px", display: "grid", "place-items": "center", background: "#76b90022", color: "#76b900" } }, icon("monitor", 22)),
          h("div", { class: "spacer" }, h("strong", {}, gpu.name), h("div", { class: "small muted" }, `Usando ${demoState.nvidiaInstalled ? "nvidia (após reiniciar)" : "nouveau (código aberto, desempenho limitado)"}`)),
          badge(demoState.nvidiaInstalled ? "Instalado" : "Driver disponível", demoState.nvidiaInstalled ? "green" : "accent")),
        h("ul", { class: "facts", style: { "list-style": "none", padding: 0, margin: 0, display: "flex", "flex-direction": "column", gap: "8px" } },
          checks.map(([ok, text]) => h("li", { class: "row-flex small" }, icon(ok ? "check-circle" : "alert-circle", 16, `ic ${ok ? "" : "faint"}`), text))),
        action);
    }

    async function install() {
      const ok = await confirm({
        title: "Instalar o driver da NVIDIA?",
        text: "Instala o driver G06 oficial, já assinado pela SUSE, a partir do repositório da NVIDIA.",
        ic: "monitor",
        facts: [
          { icon: "history", text: "Ponto de restauração obrigatório antes (marcado como protegido)." },
          { icon: "shield-check", text: "Funciona com Secure Boot ativo, sem cadastrar chaves." },
          { icon: "power", warn: true, text: "Reinício necessário. Se a tela não voltar, escolha o ponto de restauração no menu de boot." },
        ],
        confirmLabel: "Instalar",
      });
      if (!ok) return;
      await startJob("nvidia", "Driver NVIDIA", () => { demoState.nvidiaInstalled = true; });
      draw();
    }

    async function installKernel(k) {
      const ok = await confirm({
        title: `Instalar ${k.version}?`,
        text: k.note,
        ic: "terminal",
        tone: k.flavor === "longterm" ? "warn" : "",
        facts: [
          { icon: "check", text: "O kernel atual continua instalado e aparece no menu de boot." },
          k.flavor === "longterm" && { icon: "alert", warn: true, text: "Fora do suporte oficial do Lyra OS. Módulos externos (NVIDIA, VirtualBox) podem não funcionar." },
        ].filter(Boolean),
        confirmLabel: "Instalar",
      });
      if (!ok) return;
      await startJob("kernel", `Kernel ${k.version}`, () => {
        kernels.push({ version: k.version, flavor: k.flavor, running: false, default: false, installed: new Date().toISOString().slice(0, 10), size: 314572800 });
        available = available.filter((a) => a !== k);
        draw();
      });
    }

    function draw() {
      if (!hw) return;
      const mem = hw.memory;
      clear(body,
        h("div", { class: "card pad", style: { display: "flex", gap: "20px", "align-items": "center", "flex-wrap": "wrap" } },
          h("span", { style: { width: "64px", height: "64px", "border-radius": "16px", display: "grid", "place-items": "center", background: "var(--fill)", color: "var(--accent)" } }, icon("monitor", 30)),
          h("div", { class: "spacer" }, h("div", { class: "small faint" }, hw.system.vendor), h("h3", { style: { "font-size": "20px", "font-weight": "800" } }, hw.system.model), h("div", { class: "small muted" }, hw.system.firmware)),
          button("Copiar relatório", { icon: "copy", size: "sm", onClick: () => { navigator.clipboard?.writeText(JSON.stringify(hw, null, 2)); toast("Inventário copiado como JSON"); } })),

        section("Processador e memória", {}, h("div", { class: "grid c2" },
          list(row({ icon: "cpu", tint: "tint", title: hw.cpu.model, subtitle: `${hw.cpu.cores} núcleos · ${hw.cpu.threads} threads · até ${(hw.cpu.max_mhz / 1000).toLocaleString("pt-BR")} GHz` })),
          list(row({ icon: "layers", tint: "tint", title: `${bytes(mem.total, 0)} de memória`, subtitle: mem.modules.join(" · ") })))),

        section("Placas de vídeo", { id: "sec-gpu" },
          h("div", { style: { display: "flex", "flex-direction": "column", gap: "var(--gap)" } },
            list(hw.gpus.map((g) => row({ icon: "monitor", title: g.name, subtitle: `GPU ${g.kind} · driver ${g.driver}`, suffix: badge(g.status === "ok" ? "OK" : "Driver disponível", g.status === "ok" ? "green" : "accent") }))),
            nvidiaCard())),

        section("Dispositivos", {}, list(hw.devices.map((d) => row({ icon: d.icon, title: d.name, subtitle: h("span", { class: "mono" }, d.detail), suffix: badge("Funcionando", "green") })))),

        section("Kernels", { id: "sec-kernel", sub: plural(kernels.length, "instalado", "instalados") },
          list(kernels.map((k) => row({
            icon: "terminal", tint: k.running ? "tint" : "",
            title: h("span", { class: "mono", style: { "font-size": "14px", "font-weight": "600" } }, k.version),
            subtitle: `Instalado em ${new Date(k.installed).toLocaleDateString("pt-BR")} · ${bytes(k.size)}`,
            suffix: [k.running && badge("Em uso", "green"), k.default && badge("Padrão no boot", "accent"),
              !k.running && button("Remover", { size: "sm", kind: "danger-soft", onClick: async () => {
                if (await confirm({ title: `Remover ${k.version}?`, text: "O kernel em uso não é afetado.", ic: "trash", tone: "danger", confirmLabel: "Remover", confirmKind: "danger" })) {
                  kernels = kernels.filter((x) => x !== k); draw(); toast("Kernel removido");
                }
              } })],
          }))),
          available.length > 0 && h("div", { style: { "margin-top": "var(--gap)" } }, list(available.map((k) => row({
            icon: "download",
            title: h("span", { class: "mono", style: { "font-size": "14px", "font-weight": "600" } }, k.version),
            subtitle: k.note,
            suffix: [k.flavor === "longterm" && badge("Sem suporte", "yellow"), button("Instalar", { size: "sm", disabled: Boolean(running("kernel")), onClick: () => installKernel(k) })],
          }))))),

        section("Inicialização", { id: "sec-boot" }, list(
          row({ icon: "power", title: "Carregador de boot", subtitle: boot.loader, suffix: badge(boot.secure_boot ? "Secure Boot ativo" : "Secure Boot inativo", boot.secure_boot ? "green" : "yellow", "shield") }),
          row({ icon: "clock", title: "Tempo do menu", subtitle: `${boot.timeout} segundos` }),
          row({ icon: "terminal", title: "Parâmetros do kernel", subtitle: h("span", { class: "mono" }, boot.cmdline), suffix: button("Editar…", { size: "sm", onClick: () => toast("Editor de parâmetros (não incluído no protótipo)", { ic: "info" }) }) }))),
      );
    }

    ctx.cleanup(onJobs(draw));
    Promise.all([api.demo("hardware"), api.demo("nvidia"), api.demo("kernels"), api.demo("kernels_available"), api.demo("boot")]).then(([a, b, c, d, e]) => {
      [hw, nv, kernels, available, boot] = [a, b, c, d, e];
      draw();
      if (ctx.sub) requestAnimationFrame(() => document.getElementById(`sec-${ctx.sub}`)?.scrollIntoView({ block: "center" }));
    });

    return { el: h("div", {}, h("div", { class: "page-hero" }, h("div", {}, h("h2", {}, "Hardware e Kernel"), h("p", {}, "Inventário detectado pelo vegad, drivers qualificados e kernels instalados."))), body) };
  },
};
