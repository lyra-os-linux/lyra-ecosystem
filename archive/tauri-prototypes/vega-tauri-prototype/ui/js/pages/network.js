import { api } from "../api.js";
import { h, icon, clear, button, badge, toggle, row, list, section, skeletonRows, banner, confirm, toast, sheet, segmented } from "../ui.js";

const KIND_ICON = { wifi: "wifi", ethernet: "plug", vpn: "key" };

function signal(strength) {
  const bars = strength > 75 ? 4 : strength > 50 ? 3 : strength > 25 ? 2 : 1;
  const el = h("span", { style: { display: "inline-flex", gap: "2px", "align-items": "flex-end", height: "14px" }, title: `${strength}%`, "aria-label": `Sinal ${strength}%` });
  for (let i = 1; i <= 4; i++) {
    const b = h("i");
    b.style.width = "3px";
    b.style.height = `${3 + i * 3}px`;
    b.style.borderRadius = "1px";
    b.style.background = i <= bars ? "var(--fg)" : "var(--fill-3)";
    el.append(b);
  }
  return el;
}

export default {
  id: "network",
  title: "Rede e Firewall",
  icon: "globe",
  group: "system",
  keywords: ["wifi", "internet", "ip", "dns", "vpn", "proxy", "porta", "firewalld"],
  sections: [
    { id: "connections", label: "Conexões de rede", icon: "wifi", keywords: ["wifi", "ethernet", "ip"] },
    { id: "firewall", label: "Firewall", icon: "shield", keywords: ["firewalld", "portas", "zona", "ssh"] },
  ],

  render(ctx) {
    let tab = ctx.sub === "firewall" ? "firewall" : "connections";
    const body = h("div", {}, skeletonRows(4));
    let net, fw;

    function ifaceDetails(i) {
      sheet(i.label, [
        h("dl", { class: "kv card pad" },
          [["Estado", i.state === "connected" ? "Conectado" : "Desconectado"], ["Interface", i.name], ["Rede", i.ssid], ["Endereço IPv4", i.ipv4], ["Gateway", i.gateway], ["DNS", i.dns], ["Velocidade", i.speed], ["MAC", i.mac]]
            .filter(([, v]) => v).flatMap(([k, v]) => [h("dt", {}, k), h("dd", { class: /\d/.test(v) ? "mono" : "" }, v)])),
        i.kind !== "vpn" && h("div", { class: "row-flex" }, button("Configurar IPv4…", { onClick: () => toast("Editor de IPv4 (não incluído no protótipo)", { ic: "info" }) }), h("span", { class: "spacer" }), i.state === "connected" && button("Desconectar", { kind: "danger-soft" })),
      ], { wide: false });
    }

    function drawConnections() {
      const connected = net.interfaces.find((i) => i.state === "connected");
      return h("div", {},
        connected && h("div", { class: "card pad", style: { display: "flex", gap: "18px", "align-items": "center", "flex-wrap": "wrap" } },
          h("span", { style: { width: "56px", height: "56px", "border-radius": "16px", display: "grid", "place-items": "center", background: "var(--green-bg)", color: "var(--green)" } }, icon(KIND_ICON[connected.kind], 26)),
          h("div", { class: "spacer" }, h("div", { class: "small faint" }, "Conectado à internet"), h("h3", { style: { "font-size": "20px", "font-weight": "800" } }, connected.ssid ?? connected.label), h("div", { class: "small muted mono" }, `${connected.ipv4} · ${connected.speed}`)),
          button("Detalhes", { onClick: () => ifaceDetails(connected) })),
        section("Interfaces", {}, list(net.interfaces.map((i) => row({
          icon: KIND_ICON[i.kind], tint: i.state === "connected" ? "green" : "",
          title: i.label, subtitle: i.state === "connected" ? `${i.ipv4} · ${i.ssid ?? i.name}` : `${i.name} · desconectado`,
          suffix: i.kind === "vpn" ? toggle(false, (on) => toast(on ? "VPN conectada (simulado)" : "VPN desconectada"), "Conectar VPN") : badge(i.state === "connected" ? "Conectado" : "Desconectado", i.state === "connected" ? "green" : ""),
          chevron: i.kind !== "vpn", onClick: i.kind !== "vpn" ? () => ifaceDetails(i) : null,
        })))),
        section("Redes Wi-Fi", { sub: "próximas", actions: button("Buscar", { size: "sm", icon: "refresh", onClick: () => toast("Procurando redes…", { ic: "wifi" }) }) },
          list(net.wifi.map((w) => row({
            lead: h("span", { class: "lead" }, signal(w.signal)),
            title: h("span", { class: "row-flex" }, w.ssid, w.ssid === connected?.ssid && badge("Conectado", "green", "check")),
            subtitle: [w.secure ? "Protegida" : "Aberta", w.known ? " · conhecida" : ""].join(""),
            suffix: [!w.secure && icon("alert", 15, "ic faint"), w.ssid !== connected?.ssid && button("Conectar", { size: "sm", onClick: () => toast(`Conectando a ${w.ssid}…`, { ic: "wifi" }) })],
          })))),
        section("Proxy", {}, list(row({ icon: "globe", title: "Proxy do sistema", subtitle: net.proxy, chevron: true, onClick: () => toast("Configuração de proxy (não incluída no protótipo)", { ic: "info" }) }))),
      );
    }

    function drawFirewall() {
      const addPort = () => {
        const port = h("input", { class: "input", placeholder: "8080 ou 6000-6010", inputmode: "numeric" });
        let proto = "tcp";
        const note = h("input", { class: "input", placeholder: "Para que serve (opcional)" });
        const close = sheet("Abrir porta", [
          h("label", { class: "pref-group" }, h("h4", {}, "Porta ou intervalo"), port),
          h("div", { class: "pref-group" }, h("h4", {}, "Protocolo"), segmented([{ id: "tcp", label: "TCP" }, { id: "udp", label: "UDP" }], proto, (id) => (proto = id))),
          h("label", { class: "pref-group" }, h("h4", {}, "Descrição"), note),
          h("div", { class: "row-flex", style: { "justify-content": "flex-end" } }, button("Cancelar", { onClick: () => close() }), button("Abrir porta", { kind: "primary", onClick: () => {
            const value = port.value.trim();
            const valid = /^\d{1,5}(-\d{1,5})?$/.test(value) && value.split("-").every((n) => +n > 0 && +n < 65536);
            if (!valid) { port.focus(); toast("Porta inválida: use 1–65535 ou um intervalo como 6000-6010", { ic: "alert" }); return; }
            fw.ports.push({ port: value, proto, note: note.value.trim() });
            close(); draw(); toast(`Porta ${value}/${proto} aberta na zona ${fw.zone}`);
          } })),
        ], { wide: false });
        requestAnimationFrame(() => port.focus());
      };

      return h("div", {},
        h("div", { class: "card pad", style: { display: "flex", gap: "18px", "align-items": "center", "flex-wrap": "wrap" } },
          h("span", { style: { width: "56px", height: "56px", "border-radius": "16px", display: "grid", "place-items": "center", background: fw.running ? "var(--green-bg)" : "var(--red-bg)", color: fw.running ? "var(--green)" : "var(--red)" } }, icon(fw.running ? "shield-check" : "shield", 26)),
          h("div", { class: "spacer" }, h("div", { class: "small faint" }, "firewalld"), h("h3", { style: { "font-size": "20px", "font-weight": "800" } }, fw.running ? "Firewall ativo" : "Firewall desligado"), h("div", { class: "small muted" }, `Zona ${fw.zone} · ${fw.services.filter((s) => s.enabled).length} serviços e ${fw.ports.length} porta(s) liberados`)),
          toggle(fw.running, async (on, input) => {
            if (!on) {
              const ok = await confirm({ title: "Desligar o firewall?", text: "Todas as portas ficam acessíveis para a rede local.", ic: "shield", tone: "danger", confirmLabel: "Desligar", confirmKind: "danger" });
              if (!ok) { input.checked = true; return; }
            }
            fw.running = on; draw();
          }, "Firewall ativo")),
        !fw.running && h("div", { style: { "margin-top": "var(--gap)" } }, banner("danger", "alert", "Seu computador está exposto", "Ligue o firewall, principalmente em redes públicas.")),
        section("Serviços permitidos", { sub: `zona ${fw.zone}` }, list(fw.services.map((s) => row({
          icon: s.enabled ? "check-circle" : "lock", tint: s.enabled ? "green" : "",
          title: s.name, subtitle: h("span", { class: "mono" }, s.port),
          suffix: toggle(s.enabled, (on) => { s.enabled = on; toast(`${s.name}: ${on ? "permitido" : "bloqueado"}`, { action: "Desfazer", onAction: () => { s.enabled = !on; draw(); } }); }, `Permitir ${s.name}`),
        })))),
        section("Portas abertas", { actions: button("Abrir porta", { size: "sm", icon: "plus", onClick: addPort }) },
          fw.ports.length
            ? list(fw.ports.map((p) => row({ icon: "plug", title: h("span", { class: "mono", style: { "font-weight": "700" } }, `${p.port}/${p.proto}`), subtitle: p.note || "Sem descrição",
                suffix: button("Fechar", { size: "sm", kind: "danger-soft", onClick: () => { fw.ports = fw.ports.filter((x) => x !== p); draw(); toast(`Porta ${p.port}/${p.proto} fechada`, { action: "Desfazer", onAction: () => { fw.ports.push(p); draw(); } }); } }) })))
            : h("div", { class: "card pad muted small" }, "Nenhuma porta avulsa aberta.")),
      );
    }

    const tabs = segmented([{ id: "connections", label: "Conexões", icon: "wifi" }, { id: "firewall", label: "Firewall", icon: "shield" }], tab, (id) => { tab = id; draw(); });
    const draw = () => net && clear(body, tab === "firewall" ? drawFirewall() : drawConnections());
    Promise.all([api.demo("network"), api.demo("firewall")]).then(([n, f]) => { net = n; fw = f; draw(); });

    return { el: h("div", {}, h("div", { class: "page-hero" }, h("div", {}, h("h2", {}, "Rede e Firewall"), h("p", {}, "Conexões, Wi-Fi, VPN e as regras do firewalld.")), tabs), body) };
  },
};
