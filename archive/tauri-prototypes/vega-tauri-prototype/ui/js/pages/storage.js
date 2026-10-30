import { api } from "../api.js";
import { h, icon, clear, button, badge, row, list, section, skeletonRows, empty, toast, confirm, bytes, meter, ring } from "../ui.js";

const TRANSPORT = { nvme: "NVMe", sata: "SATA", usb: "USB", mmc: "Cartão SD" };

export default {
  id: "storage",
  title: "Armazenamento",
  icon: "disk",
  group: "system",
  keywords: ["disco", "ssd", "particao", "montar", "pendrive", "espaco"],

  render() {
    const body = h("div", {}, skeletonRows(4));

    async function eject(disk) {
      const ok = await confirm({ title: `Ejetar ${disk.model ?? disk.name}?`, text: "Os dados pendentes são gravados antes. Depois é seguro desconectar.", ic: "disk", confirmLabel: "Ejetar" });
      if (ok) toast(`${disk.model ?? disk.name} pode ser removido`);
    }

    function partitionRow(p) {
      const hasFs = p.fssize > 0;
      const used = hasFs ? p.fsused / p.fssize : 0;
      return row({
        icon: p.fstype === "swap" ? "layers" : p.mountpoint === "/" ? "star" : "folder",
        tint: p.mountpoint === "/" ? "tint" : "",
        title: h("span", { class: "row-flex" }, p.label || p.mountpoint || p.name, p.fstype && badge(p.fstype, "outline")),
        subtitle: hasFs
          ? h("div", { style: { display: "flex", "flex-direction": "column", gap: "6px", "margin-top": "4px", "max-width": "420px" } }, meter(used), `${bytes(p.fsused)} usados de ${bytes(p.fssize)} · ${p.mountpoint}`)
          : `${bytes(p.size)} · ${p.mountpoint ?? "Não montada"}`,
        suffix: h("span", { class: "mono faint hide-narrow" }, `/dev/${p.name}`),
      });
    }

    api.volumes().then((data) => {
      const disks = (data?.blockdevices ?? []).filter((d) => d.type === "disk" && !d.name.startsWith("zram") && !d.name.startsWith("loop"));
      if (!disks.length) return clear(body, empty("disk", "Nenhum disco encontrado", "O lsblk não retornou dispositivos."));
      const root = disks.flatMap((d) => d.children ?? []).find((p) => p.mountpoint === "/");
      const rootUsed = root?.fssize ? root.fsused / root.fssize : 0;
      clear(body,
        root && h("div", { class: "card pad", style: { display: "flex", gap: "22px", "align-items": "center", "flex-wrap": "wrap" } },
          ring(rootUsed, { size: 96, stroke: 10 }),
          h("div", { class: "spacer" },
            h("div", { class: "small faint" }, "Sistema (/)"),
            h("h3", { style: { "font-size": "22px", "font-weight": "800" } }, `${bytes(root.fssize - root.fsused)} livres`),
            h("p", { class: "muted small" }, `${bytes(root.fsused)} de ${bytes(root.fssize)} em ${root.fstype}. Os pontos de restauração ficam neste volume.`)),
          button("Liberar espaço…", { icon: "trash", onClick: () => toast("Análise de limpeza (não incluída no protótipo)", { ic: "info" }) })),
        disks.map((d) => section(d.model?.trim() || d.name, {
          sub: `${bytes(d.size, 0)} · ${TRANSPORT[d.tran] ?? d.tran ?? "disco"}`,
          actions: d.rm || d.tran === "usb" ? button("Ejetar", { size: "sm", icon: "arrow-up", onClick: () => eject(d) }) : badge("Interno", "outline"),
        }, list((d.children?.length ? d.children : [d]).map(partitionRow)))),
      );
    });

    return { el: h("div", {}, h("div", { class: "page-hero" }, h("div", {}, h("h2", {}, "Armazenamento"), h("p", {}, "Discos, partições e uso de espaço."))), body) };
  },
};
