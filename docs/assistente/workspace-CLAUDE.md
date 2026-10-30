# Workspace Lyra OS

Este diretório não é um repositório Git. Ele contém, lado a lado, os clones de
todos os repositórios da organização
[lyra-os-linux](https://github.com/lyra-os-linux). Cada subdiretório é um
repositório independente, com seu próprio Git, CI, testes e ciclo de release.
Faça commits, branches e PRs dentro do repositório afetado, nunca na raiz.

Lyra OS é uma distribuição Linux desktop e server baseada no **openSUSE Leap
16.1**. A edição principal é a **GNOME (Wayland)**, única edição Desktop, com
lançamento da 16.1 em 05/11/2026. As edições KDE Plasma e XFCE foram
abandonadas em 24/10/2026 (ADR 0018 de `lyraos-desktop`), e seus repositórios
estão arquivados no GitHub. Os pacotes são publicados no OBS
(`home:rodrigosbrito:lyra`, `home:rodrigosbrito:lyra:staging` e
`home:rodrigosbrito:vega`). A documentação e os commits são majoritariamente em
português.

## Regras gerais

- Leia o `README.md` e, quando existir, o `AGENTS.md` do repositório antes de
  alterá-lo. Os `AGENTS.md` de `lyraos-desktop` e `lyraos-server` definem os
  princípios do projeto. Os principais: estabilidade em primeiro lugar,
  reaproveitar o openSUSE em vez de reinventar, e congelamento funcional a
  partir da Beta 1.
- `lyra-ecosystem` é o catálogo da organização. `products.toml` registra
  propriedade e as relações `consumes`/`consumed_by`, e `contracts.toml` guarda
  os valores que precisam ficar coerentes entre repositórios. Uma mudança
  incompatível exige coordenação com todos os consumidores declarados. Para
  validar, rode `python3 lyra-ecosystem/scripts/validate.py`, que funciona
  offline e espera os repositórios como diretórios irmãos. Se o layout for
  outro, aponte `LYRA_WORKSPACE` para o diretório que os contém.
- As edições consomem **RPMs promovidos no OBS**, não o estado de outros
  checkouts locais.
- O contrato D-Bus `org.lyraos.Vega1` fica em `lyra-vega-dbus/dbus/`. A
  implementação Go em `vegad/internal/dbusserver/` precisa permanecer em
  sincronia com ele.

## Projetos

### Edições (imagens KIWI, ISO live e instalador)

| Repositório | Descrição |
| --- | --- |
| `lyraos-desktop` | Edição **GNOME**, a principal, codinome "Odisseia" 16.1. Contém a descrição KIWI, o instalador, a configuração do OBS, i18n, gates de desempenho e evidências de qualificação (`release.toml`, `image-build.toml`). Gera uma única ISO, sem NVIDIA pré-instalada; o driver é instalado depois, opcionalmente, pelo Vega. |
| `lyraos-server` | Edição headless, codinome "Delos". Usa KIWI, um instalador TUI em `dialog`, ext4 em disco único e firewall com apenas SSH e a porta 9090. É administrada por `vega-cli`, `vegad` e `vega-web` (`release-server.toml`). |

### Vega: centro de controle (daemon, contrato e frontends)

| Repositório | Linguagem | Descrição |
| --- | --- | --- |
| `vegad` | Go | Daemon privilegiado ativado sob demanda pelo D-Bus e autorizado por polkit. Cuida de Zypper, Snapper, kernel, hardware, rede, firewall, usuários e NVIDIA, com perfis `desktop` e `server`. Build: `go build -trimpath -o vegad ./cmd/vegad`. |
| `lyra-vega-dbus` | Rust | XMLs do contrato `org.lyraos.Vega1` e o crate cliente tipado. Os consumidores o fixam por tag (`scripts/check-consumer-pin.sh`). |
| `vega` | Rust, GTK4/libadwaita | `vega-gtk`, frontend principal para GNOME, e `vega-virtualization`, além da documentação do produto. |
| `vega-cli` | Bash, `dialog` | Frontend de terminal (`bin/vega`) pensado para uso via SSH. Usa `busctl`, `jq` e `pkttyagent`. |
| `vega-web` | Rust | Painel HTTPS só para a LAN, com login PAM e terminal web restrito ao grupo `wheel`. Build: `cargo build --release --locked`. |

### Aplicações

| Repositório | Linguagem | Descrição |
| --- | --- | --- |
| `beam` | Rust, GTK4 | Cliente RDP baseado em IronRDP. Credenciais via `oo7` e certificados por TOFU. Crates `beam-core` e `beam-gtk`. |
| `sulafat` | Rust, GTK4/VTE | Cliente SSH que roda o `ssh` do OpenSSH num terminal embutido, tendo `~/.ssh/config` como fonte da verdade. Crates `sulafat-core` e `sulafat-gtk`. |
| `lyra-downloads` | Rust, GTK4 | Gerenciador de downloads com motor aria2, fila persistente em SQLite e verificação SHA-256. |
| `lyra-firefox-ext` | TypeScript | Extensão do Firefox que envia downloads ao Lyra Downloads por native messaging (`org.lyraos.downloads`). Comandos: `npm ci`, `npm test`, `npm run lint`; para assinar no AMO, `scripts/sign.sh`. |
| `lyra-vms` | Rust | Abre o console gráfico de VMs QEMU/KVM, delegando ao `virt-viewer`. O ciclo de vida das VMs pertence ao Vega. Testes só em VMs descartáveis. |
| `lyraos-desktop-updater` | Rust, Tauri | `lyra-upgrade`, atualizador recuperável que combina zypper, Snapper e `system-update.target` offline. Workspace com `core`, `protocol`, `cli`, `service`, `offline`, `verifier`, `src-tauri` e `ui`. Testes: `cargo test --workspace`. |
| `lyraos-desktop-welcome` | Rust, Tauri | `lyra-welcome`, assistente do primeiro login, em inglês, português e espanhol. Testes: `python3 -m unittest discover -s tests -v` e `node tests/test-pickers.mjs`. |
| `lyraos-desktop-sheliak` | TypeScript | Seis extensões do GNOME Shell 48 num só RPM: Dock, Painel, Menus, Busca, Animações e Desktop Icons. Build: `npm run build`. |

### Identidade visual

| Repositório | Descrição |
| --- | --- |
| `lyraos-desktop-theme` | `lyra-os-theme`: GRUB, Plymouth, logo do GDM e sincronização da cor de destaque com os ícones. GTK e Shell seguem o Adwaita padrão. |
| `lyraos-desktop-icons` | `lyra-os-icons`, tema de ícones com herança do Adwaita e nove variantes de cor de destaque. Build: `scripts/build-icons.sh`. |
| `lyraos-desktop-wallpapers` | `lyra-os-wallpapers`, com apenas os wallpapers Dawn e Voyage. |

### Empacotamento de terceiros (só RPM/OBS, sem código próprio)

| Repositório | Descrição |
| --- | --- |
| `lyraos-desktop-linuxtoys` | LinuxToys com o self-update desativado. Há scripts de atualização automática para o staging; a promoção para produção é sempre manual. |
| `zededitor` | Editor Zed com binário upstream fixado por checksum. O launcher redireciona as atualizações para o Zypper. |
| `vscode` | `vscode-repo`, que só registra o repositório oficial da Microsoft, porque a EULA proíbe redistribuir o binário. |

### Organização e site

| Repositório | Descrição |
| --- | --- |
| `lyra-ecosystem` | Catálogo de produtos, contratos, ADRs e o fluxo Git → OBS → imagens. Não participa do build. |
| `site` | Site estático do Lyra OS (GitHub Pages), com documentação em `docs/` (pt, en, es, it). Scripts `scripts/build-docs.py` e `scripts/check-docs.py`. |

O catálogo `lyra-ecosystem/products.toml` lista os 24 repositórios deste
workspace.

## Comandos comuns

- Rust: `cargo test --locked`, `cargo fmt --all --check` e
  `cargo clippy --locked --all-targets --all-features -- -D warnings`.
- Repositórios de empacotamento: `python3 -m unittest discover -s tests -v` e
  `rpmspec -P <pacote>.spec`.
- Os comandos de CI de cada repositório ficam em `.github/workflows/`, em
  geral no `contracts.yml`.

## Atualizar todos os clones

```bash
for d in */; do git -C "$d" pull --ff-only; done
```
