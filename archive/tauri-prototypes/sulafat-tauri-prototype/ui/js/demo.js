// Backend simulado do protótipo. Espelha o modelo do sulafat-core (SshHost do
// ~/.ssh/config e HostMeta com grupo, cor e notas) para que o layout já nasça
// com o formato de dados do produto. Nada aqui abre conexões nem toca arquivos.

let seq = 0;
const host = (o) => ({ alias: "", host_name: null, user: null, port: null, identity_file: null, proxy_jump: null, extra: "", read_only: false, ...o });
const meta = (group, color, notes = null) => ({ group, color, notes });

export const hosts = [
  host({ alias: "web01", host_name: "web01.empresa.local", user: "deploy", identity_file: "~/.ssh/id_ed25519", extra: "ServerAliveInterval 30" }),
  host({ alias: "db01", host_name: "10.20.0.12", user: "postgres", port: 2222, proxy_jump: "bastion" }),
  host({ alias: "backup", host_name: "backup.empresa.local", user: "root" }),
  host({ alias: "bastion", host_name: "bastion.empresa.com.br", user: "rodrigo", identity_file: "~/.ssh/id_ed25519_sk" }),
  host({ alias: "leap-vm", host_name: "192.168.122.57", user: "rodrigo" }),
  host({ alias: "obs-worker", host_name: "build.lyraos.com.br", user: "lyra", port: 2200 }),
  host({ alias: "pi", host_name: "raspberrypi.local", user: "pi" }),
  host({ alias: "*.empresa.local", user: "deploy", extra: "ForwardAgent no\nStrictHostKeyChecking yes", read_only: true }),
];

export const metas = {
  web01: meta("Produção", "#26a269", "Nginx + app Rust. Deploy às sextas não."),
  db01: meta("Produção", "#e66100", "PostgreSQL 16 primário. Acesso só via bastion."),
  backup: meta("Produção", "#9141ac"),
  bastion: meta("Produção", "#3584e4"),
  "leap-vm": meta("Lyra OS", "#2190a4", "VM de testes do Leap 16.1."),
  "obs-worker": meta("Lyra OS", "#c64600"),
  pi: meta(null, "#e01b24", "Sensor da varanda."),
};

export const settings = { font: "Adwaita Mono 11", scrollback_lines: 10000 };

/** Linha de comando equivalente, como o sulafat-core monta (`ssh <alias>`). */
export const commandFor = (h) => (h.alias.includes("*") ? null : `ssh ${h.alias}`);

/** Uma sessão "terminal" simulada: linhas com segmentos coloridos. */
export function transcript(h) {
  const who = `${h.user ?? "rodrigo"}@${(h.host_name ?? h.alias).split(".")[0]}`;
  const p = (cmd) => [["g", `${who}`], ["", ":"], ["b", "~"], ["", "$ "], ["", cmd]];
  return [
    [["d", `Last login: Sun Oct 25 14:02:11 2026 from 10.20.0.5`]],
    [["", ""]],
    [["", "  Lyra OS 16.1 (Odisseia) · openSUSE Leap 16.1"]],
    [["", "  Carga: 0,21 0,18 0,12 · Memória: 31% · Disco /: 46%"]],
    [["", ""]],
    p("uptime"),
    [["", " 17:41:03 up 12 days,  3:07,  1 user,  load average: 0.21, 0.18, 0.12"]],
    p("systemctl --failed --no-legend"),
    [["d", "(nenhuma unidade com falha)"]],
    p("sudo zypper -q refresh"),
    [["y", "[sudo] password for "], ["y", h.user ?? "rodrigo"], ["y", ":"]],
    [["", "Todos os repositórios foram atualizados."]],
    p("ls --color"),
    [["b", "backups  "], ["b", "logs  "], ["g", "deploy.sh  "], ["", "notas.txt  "], ["r", "core.1234"]],
  ];
}

export const api = {
  async save(original, next, nextMeta) {
    const i = hosts.findIndex((x) => x.alias === original);
    if (i >= 0) hosts[i] = next; else hosts.push(next);
    if (original && original !== next.alias) delete metas[original];
    metas[next.alias] = nextMeta;
  },
  async remove(alias) { hosts.splice(hosts.findIndex((x) => x.alias === alias), 1); delete metas[alias]; },
  async duplicate(alias) {
    const src = hosts.find((x) => x.alias === alias);
    let copy = `${alias}-copia`;
    while (hosts.some((x) => x.alias === copy)) copy += "-1";
    hosts.splice(hosts.indexOf(src) + 1, 0, { ...src, alias: copy, read_only: false });
    metas[copy] = { ...(metas[alias] ?? meta(null, null)) };
    return copy;
  },
  nextTabId: () => ++seq,
};
