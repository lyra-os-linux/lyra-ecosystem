# Vega em Tauri: protótipo

Protótipo para avaliar a troca do `vega-gtk` (GTK4/libadwaita) por Tauri 2
(Rust + WebKitGTK). O foco é layout e UX. Não substitui o produto e não é um
repositório da organização.

## Rodar

Dependências de build no Lyra/openSUSE Leap 16.1:

```sh
sudo zypper install webkit2gtk3-devel libsoup-devel
cargo install tauri-cli --version '^2' --locked   # opcional; dá hot reload com `cargo tauri dev`
```

```sh
cd src-tauri
cargo run            # ou: cargo tauri dev
```

Para ver só a interface, sem compilar:

```sh
python3 -m http.server -d ui 8000   # abra http://localhost:8000
```

No navegador a interface usa os dados de `ui/demo/fixtures.json` e simula
métricas e tarefas.

## O que é real e o que é simulado

| Área | Fonte |
| --- | --- |
| Visão geral, CPU, memória, rede, processos | `/proc`, `ps` (real) |
| Serviços | `systemctl list-units/list-unit-files -o json` (real, só leitura) |
| Log do sistema | `journalctl -o json` (real) |
| Armazenamento | `lsblk -J` (real) |
| Tema e cor de destaque | `gsettings` do GNOME (real) |
| Zypper, Flatpak, Snapper, Restic, NVIDIA, kernel, firewall, rede, usuários, perfis | `fixtures.json` (simulado) |
| Tarefas longas (atualizar, instalar driver, backup) | eventos `vega-job` emitidos pelo Rust (simulado) |

As ações que mudam o sistema (iniciar serviço, abrir porta, remover app...)
só alteram o estado em memória. Para virar produto, `demo.rs` e `jobs.rs` são
trocados por chamadas ao crate `lyra-vega-dbus` (`org.lyraos.Vega1`). O vegad
e o polkit continuam iguais.

## Decisões de UX

- **Cara de app GNOME.** Usa os tokens do libadwaita 1.7 (cores, raios,
  sidebar, boxed lists, diálogos no estilo `AdwAlertDialog`), a fonte Adwaita
  Sans e a cor de destaque e o modo escuro lidos do GNOME. A barra de título é
  própria (CSD), com botões, arrastar, duplo clique e bordas de redimensionar.
- **Painel com um único estado de saúde.** O cartão principal mostra a ação
  mais útil do momento: correções de segurança, atualização em andamento ou
  "Tudo em ordem".
- **Toda ação destrutiva explica o que vai acontecer.** Os diálogos de
  confirmação listam ponto de restauração, pedido de senha (polkit), reinício
  necessário e reversibilidade. Remover usuário exige digitar o login.
- **Desfazer em vez de perguntar** nas ações leves e reversíveis, como
  repositório, serviço do firewall, porta e perfil do desktop, com um toast
  "Desfazer".
- **Tarefas longas nunca bloqueiam.** Elas aparecem no botão de tarefas do
  cabeçalho em qualquer página, com etapas, porcentagem e log.
- **Busca global** com `Ctrl K`, ou começando a digitar em qualquer lugar,
  como no GNOME Settings. Encontra páginas, seções (Firewall, Kernel,
  Repositórios...) e ações (criar ponto de restauração, alternar o tema).
- **Adaptativo.** Abaixo de 820 px a sidebar vira gaveta; abaixo de 520 px os
  grids ficam em uma coluna.
- **Teclado e acessibilidade.** `Alt 1…9` troca de página, `F5` recarrega,
  `Ctrl ,` abre as preferências e `Ctrl ?` mostra os atalhos. Há foco visível,
  foco preso nos diálogos, papéis ARIA e respeito a
  `prefers-reduced-motion`.
- **Segurança da webview.** CSP sem `unsafe-inline`. O DOM é montado com nós,
  sem `innerHTML` com dados, então mensagens do journal não viram HTML.

## Estrutura

```
src-tauri/src/main.rs     comandos registrados
src-tauri/src/system.rs   leituras reais e sem privilégio
src-tauri/src/demo.rs     dados simulados (mesmo arquivo da pré-visualização)
src-tauri/src/jobs.rs     tarefas longas simuladas, emitidas como eventos
ui/js/main.js             janela, navegação, busca, preferências, atalhos
ui/js/ui.js               componentes (listas, diálogos, toasts, gráficos)
ui/js/pages/*.js          uma página por arquivo
ui/css/app.css            tokens de design e componentes
```

Sem npm e sem bundler, como o `lyra-welcome`: o HTML/CSS/JS é servido direto.
