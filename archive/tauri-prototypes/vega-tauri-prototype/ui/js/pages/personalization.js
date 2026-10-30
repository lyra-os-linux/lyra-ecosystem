import { api } from "../api.js";
import { demoState } from "../store.js";
import { h, icon, clear, toggle, row, list, section, skeletonRows, toast } from "../ui.js";

function mock(id) {
  return h("div", { class: `mock ${id}`, "aria-hidden": "true" }, h("div", { class: "topbar" }), h("div", { class: "win" }), h("div", { class: "dock" }, h("i"), h("i"), h("i"), h("i"), h("i")));
}

export default {
  id: "personalization",
  title: "Personalização",
  icon: "palette",
  group: "system",
  keywords: ["layout", "dock", "painel", "perfil", "ubuntu", "tema", "aparencia", "sheliak"],

  render() {
    const body = h("div", {}, skeletonRows(3));

    api.demo("profiles").then((profiles) => {
      const grid = h("div", { class: "grid c3", role: "radiogroup", "aria-label": "Perfil do desktop" });
      const paint = () => clear(grid, profiles.map((p) =>
        h("button", { class: "card profile-card", role: "radio", "aria-checked": String(p.id === demoState.profile), onclick: () => choose(p) },
          h("span", { class: "tick" }, icon("check", 13)),
          mock(p.id),
          h("div", { class: "meta" }, h("strong", {}, p.name), h("span", {}, p.description)))));
      const choose = (p) => {
        if (p.id === demoState.profile) return;
        const previous = profiles.find((x) => x.id === demoState.profile);
        demoState.profile = p.id;
        paint();
        toast(`Perfil ${p.name} aplicado`, { action: "Desfazer", onAction: () => { demoState.profile = previous.id; paint(); } });
      };
      paint();

      clear(body,
        section("Layout do desktop", { sub: "Sheliak 2" }, grid),
        h("p", { class: "small faint", style: { margin: "10px 4px 0" } }, "Cada perfil guarda suas próprias preferências de dock e menus. Voltar a um perfil restaura como você o deixou."),
        section("Comportamento", {}, list(
          row({ icon: "grid", title: "Botão de áreas de trabalho", subtitle: "Mostrar no painel superior", suffix: toggle(false, () => {}, "Botão de áreas de trabalho") }),
          row({ icon: "search", title: "Busca no painel", subtitle: "Campo de busca ao lado do menu de aplicativos", suffix: toggle(true, () => {}, "Busca no painel") }),
          row({ icon: "sparkles", title: "Animações", subtitle: "Efeitos ao abrir e minimizar janelas", suffix: toggle(true, () => {}, "Animações") }),
        )),
        section("Tela de bloqueio", {}, list(
          row({ icon: "lock", title: "Bloquear automaticamente", subtitle: "Depois de 5 minutos sem uso", suffix: toggle(true, () => {}, "Bloquear automaticamente") }),
          row({ icon: "bell", title: "Notificações na tela de bloqueio", subtitle: "Mostrar o conteúdo das notificações", suffix: toggle(false, () => {}, "Notificações na tela de bloqueio") }),
        )),
      );
    });

    return { el: h("div", {}, h("div", { class: "page-hero" }, h("div", {}, h("h2", {}, "Personalização"), h("p", {}, "Escolha como o desktop se organiza. Cores e tema seguem as Configurações do GNOME."))), body) };
  },
};
