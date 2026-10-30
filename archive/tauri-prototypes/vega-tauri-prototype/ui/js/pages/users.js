import { api } from "../api.js";
import { h, icon, clear, button, badge, toggle, row, list, section, skeletonRows, toast, sheet, confirm, hueFor } from "../ui.js";

function avatar(name, size = 52) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const el = h("span", { "aria-hidden": "true" }, initials);
  Object.assign(el.style, { width: `${size}px`, height: `${size}px`, borderRadius: "50%", display: "grid", placeItems: "center", color: "#fff", fontWeight: "800", fontSize: `${size * 0.36}px`, flex: "none", background: `linear-gradient(150deg, ${hueFor(name)}, ${hueFor(name + "!")})` });
  return el;
}

export default {
  id: "users",
  title: "Usuários",
  icon: "users",
  group: "admin",
  keywords: ["conta", "senha", "administrador", "wheel", "grupo"],

  render() {
    const body = h("div", {}, skeletonRows(3));
    let users = [];

    function details(u) {
      const close = sheet(u.name, [
        h("div", { style: { display: "flex", gap: "16px", "align-items": "center" } }, avatar(u.name, 64), h("div", {}, h("h3", { style: { "font-size": "19px", "font-weight": "800" } }, u.name), h("div", { class: "mono muted" }, u.login))),
        list(
          row({ icon: "key", title: "Administrador", subtitle: "Pode instalar programas e mudar o sistema (grupo wheel)", suffix: toggle(u.admin, (on, input) => {
            if (u.current && !on) { input.checked = true; toast("Você não pode remover seu próprio acesso de administrador", { ic: "alert" }); return; }
            u.admin = on; draw();
          }, "Administrador") }),
          row({ icon: "lock", title: "Conta bloqueada", subtitle: "Impede novos logins sem apagar os arquivos", suffix: toggle(Boolean(u.locked), (on) => { u.locked = on; draw(); }, "Bloquear conta") }),
          row({ icon: "key", title: "Senha", subtitle: "Definir uma nova senha", chevron: true, onClick: () => toast("Troca de senha via polkit (simulado)", { ic: "info" }) }),
          row({ icon: "users", title: "Grupos", subtitle: u.groups.join(", ") }),
          row({ icon: "terminal", title: "Shell", subtitle: h("span", { class: "mono" }, u.shell) })),
        !u.current && h("div", { class: "row-flex", style: { "justify-content": "flex-end" } }, button("Remover usuário…", { kind: "danger-soft", icon: "trash", onClick: async () => {
          const ok = await confirm({ title: `Remover ${u.name}?`, text: "A conta deixa de existir.", ic: "trash", tone: "danger", confirmKind: "danger", confirmLabel: "Remover", requireText: u.login,
            facts: [{ icon: "alert", warn: true, text: `A pasta /home/${u.login} também será apagada.` }] });
          if (!ok) return;
          users = users.filter((x) => x !== u); close(); draw(); toast(`${u.name} removido`);
        } })),
      ], { wide: false });
    }

    function add() {
      const name = h("input", { class: "input", placeholder: "Nome completo" });
      const login = h("input", { class: "input mono", placeholder: "login" });
      let edited = false;
      login.addEventListener("input", () => (edited = true));
      name.addEventListener("input", () => {
        if (!edited) login.value = name.value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().split(/\s+/)[0]?.replace(/[^a-z0-9_-]/g, "") ?? "";
      });
      let admin = false;
      const close = sheet("Novo usuário", [
        h("label", { class: "pref-group" }, h("h4", {}, "Nome"), name),
        h("label", { class: "pref-group" }, h("h4", {}, "Login"), login),
        list(row({ icon: "key", title: "Administrador", subtitle: "Pode instalar programas e mudar o sistema", suffix: toggle(false, (on) => (admin = on), "Administrador") })),
        h("p", { class: "small faint" }, "A senha é definida no primeiro login."),
        h("div", { class: "row-flex", style: { "justify-content": "flex-end" } }, button("Cancelar", { onClick: () => close() }), button("Criar", { kind: "primary", onClick: () => {
          if (!name.value.trim() || !/^[a-z_][a-z0-9_-]{0,31}$/.test(login.value)) { toast("Informe um nome e um login válido (minúsculas, sem espaços)", { ic: "alert" }); return; }
          users.push({ login: login.value, name: name.value.trim(), admin, current: false, uid: 1000 + users.length, shell: "/bin/bash", last: "Nunca", groups: admin ? ["users", "wheel"] : ["users"] });
          close(); draw(); toast(`${name.value.trim()} criado`);
        } })),
      ], { wide: false });
      requestAnimationFrame(() => name.focus());
    }

    function draw() {
      clear(body, section("Contas", { actions: button("Adicionar", { kind: "primary", size: "sm", icon: "plus", onClick: add }) },
        h("div", { class: "grid auto" }, users.map((u) =>
          h("button", { class: "card interactive", style: { padding: "22px 18px", display: "flex", "flex-direction": "column", "align-items": "center", gap: "10px", "text-align": "center", opacity: u.locked ? "0.6" : "1" }, onclick: () => details(u) },
            avatar(u.name, 64),
            h("div", {}, h("strong", { style: { "font-size": "15.5px" } }, u.name), h("div", { class: "small muted mono" }, u.login)),
            h("div", { class: "row-flex", style: { "justify-content": "center" } }, u.current && badge("Você", "accent"), u.admin && badge("Admin", "", "key"), u.locked && badge("Bloqueada", "yellow", "lock")),
            h("div", { class: "small faint" }, `Último acesso: ${u.last}`))))));
    }

    api.demo("users").then((u) => { users = u; draw(); });
    return { el: h("div", {}, h("div", { class: "page-hero" }, h("div", {}, h("h2", {}, "Usuários"), h("p", {}, "Contas locais deste computador."))), body) };
  },
};
