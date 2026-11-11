# Bugs

Gerado em 11/11/2026 10:57 a partir do GitHub (`lyra-os-linux`). Issues com o label `bug`, abertas e fechadas (exceto as de Apps Android).
Para atualizar: `python3 relatorios/gerar_relatorios.py`.

Situação: **Na fila** = aberta, sem PR nem commit que a cite · **Começou** = há PR ou commit que cita a issue (citar não prova trabalho: veja a evidência) · **Entregue** = fechada como concluída · **Não planejada** = fechada sem entrega.

## Resumo

| Repositório | Total | Na fila | Começou | Entregue | Não planejada |
| --- | ---: | ---: | ---: | ---: | ---: |
| beam | 3 | 0 | 0 | 3 | 0 |
| lyra-downloads | 1 | 0 | 0 | 1 | 0 |
| lyra-ecosystem | 3 | 0 | 0 | 3 | 0 |
| lyra-vega-dbus | 1 | 0 | 0 | 1 | 0 |
| lyraos-desktop | 21 | 0 | 0 | 15 | 6 |
| lyraos-desktop-icons | 1 | 0 | 0 | 1 | 0 |
| lyraos-desktop-kde | 2 | 0 | 0 | 2 | 0 |
| lyraos-desktop-linuxtoys | 3 | 0 | 0 | 3 | 0 |
| lyraos-desktop-sheliak | 5 | 0 | 0 | 5 | 0 |
| lyraos-desktop-theme | 3 | 0 | 0 | 3 | 0 |
| lyraos-desktop-updater | 9 | 0 | 0 | 9 | 0 |
| lyraos-desktop-welcome | 1 | 0 | 0 | 1 | 0 |
| lyraos-desktop-xfce | 2 | 0 | 0 | 2 | 0 |
| lyraos-server | 6 | 0 | 0 | 5 | 1 |
| sulafat | 3 | 0 | 0 | 3 | 0 |
| vega | 20 | 0 | 0 | 20 | 0 |
| vega-cli | 2 | 0 | 0 | 2 | 0 |
| vega-web | 10 | 0 | 0 | 10 | 0 |
| vegad | 32 | 0 | 0 | 32 | 0 |
| **Total** | **128** | **0** | **0** | **121** | **7** |

## beam

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#2](https://github.com/lyra-os-linux/beam/issues/2) | [P2][RDP] Manter cancelamento e UI responsivos sob bloqueio de escrita | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 11/09/2026 | [beam#3](https://github.com/lyra-os-linux/beam/pull/3) (mergeado) |
| [#7](https://github.com/lyra-os-linux/beam/issues/7) | Tauri: WebKitWebProcess aborta com corrupção de heap ao fechar (mesmo bug do vega#166) | `bug`, `gnome` | — | 29/10/2026 | Não | Sim | Sim | 29/10/2026 | [beam#8](https://github.com/lyra-os-linux/beam/pull/8) (mergeado), [49546fa](https://github.com/lyra-os-linux/beam/commit/49546fa91427647cf1f366d88467f0ba5c2b731a) |
| [#11](https://github.com/lyra-os-linux/beam/issues/11) | Chave privada RSA do xrdp (rsakeys.ini) commitada no repositório público | `bug` | — | 09/11/2026 | Não | Sim | Sim | 10/11/2026 | [beam#12](https://github.com/lyra-os-linux/beam/pull/12) (mergeado), [beam#13](https://github.com/lyra-os-linux/beam/pull/13) (mergeado) |

## lyra-downloads

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#5](https://github.com/lyra-os-linux/lyra-downloads/issues/5) | Tauri: WebKitWebProcess aborta com corrupção de heap ao fechar (mesmo bug do vega#166) | `bug` | — | 29/10/2026 | Não | Sim | Sim | 29/10/2026 | [lyra-downloads#6](https://github.com/lyra-os-linux/lyra-downloads/pull/6) (mergeado), [41fc7da](https://github.com/lyra-os-linux/lyra-downloads/commit/41fc7da83f3f59483c1d8db8573a2879042bef39) |

## lyra-ecosystem

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#6](https://github.com/lyra-os-linux/lyra-ecosystem/issues/6) | [P2][Contratos] Reconciliar versão do produto, schema de release e política do site | `bug` | Auditoria 2026.09 — Manutenção e qualidade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyra-ecosystem#26](https://github.com/lyra-os-linux/lyra-ecosystem/pull/26) (mergeado) |
| [#7](https://github.com/lyra-os-linux/lyra-ecosystem/issues/7) | [P2][QA] Tornar a checagem de dependências do gate efetivamente somente leitura | `bug` | Auditoria 2026.09 — Manutenção e qualidade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyra-ecosystem#26](https://github.com/lyra-os-linux/lyra-ecosystem/pull/26) (mergeado) |
| [#25](https://github.com/lyra-os-linux/lyra-ecosystem/issues/25) | [GNOME] [Investigação] Idioma/RPM do Vega GTK e compatibilidade do instalador | `bug`, `gnome` | — | 08/09/2026 | Não | Sim | Sim | 30/10/2026 | [lyra-ecosystem#27](https://github.com/lyra-os-linux/lyra-ecosystem/pull/27) (mergeado), [lyraos-desktop#84](https://github.com/lyra-os-linux/lyraos-desktop/pull/84) (mergeado), [vega#143](https://github.com/lyra-os-linux/vega/pull/143) (mergeado) |

## lyra-vega-dbus

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#21](https://github.com/lyra-os-linux/lyra-vega-dbus/issues/21) | CI: introspecção contra o vegad não compara assinaturas e o teste ao vivo aceita AuthorizationFailed | `bug` | — | 05/11/2026 | Não | Sim | Sim | 10/11/2026 | [lyra-vega-dbus#23](https://github.com/lyra-os-linux/lyra-vega-dbus/pull/23) (mergeado), [vegad#155](https://github.com/lyra-os-linux/vegad/pull/155) (mergeado), [vegad#156](https://github.com/lyra-os-linux/vegad/pull/156) (mergeado), [4552931](https://github.com/lyra-os-linux/vegad/commit/455293115ac6978c756a327df5b2a3d8786c2179) |

## lyraos-desktop

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#12](https://github.com/lyra-os-linux/lyraos-desktop/issues/12) | [Desktop Alpha 5] Incluir Git para a integração Fish/nvm-fish | `bug`, `alpha-5`, `desktop`, `packaging`, `stability` | — | 23/08/2026 | Não | Sim | Sim | 31/08/2026 | — |
| [#22](https://github.com/lyra-os-linux/lyraos-desktop/issues/22) | [GNOME] [NVIDIA] Monitor externo não acorda após DPMS ou suspensão | `bug`, `desktop`, `qa`, `stability`, `gnome` | — | 23/08/2026 | Não | Sim | Sim | 10/11/2026 | [lyraos-desktop#94](https://github.com/lyra-os-linux/lyraos-desktop/pull/94) (mergeado), [lyraos-desktop#226](https://github.com/lyra-os-linux/lyraos-desktop/pull/226) (mergeado), [lyraos-desktop#535](https://github.com/lyra-os-linux/lyraos-desktop/pull/535) (mergeado), [lyraos-desktop#536](https://github.com/lyra-os-linux/lyraos-desktop/pull/536) (mergeado), [65cf125](https://github.com/lyra-os-linux/lyraos-desktop/commit/65cf125ab68f99664e616ff7b3362fb9d0bf21c5), [c0bf526](https://github.com/lyra-os-linux/lyraos-desktop/commit/c0bf526605419e70043c5e381a8fac6949f91a05) |
| [#23](https://github.com/lyra-os-linux/lyraos-desktop/issues/23) | [Desktop][QA] Tornar o teste destrutivo do instalador estritamente fail-closed | `bug`, `alpha-5`, `desktop`, `qa`, `stability` | — | 23/08/2026 | Não | Sim | Sim | 31/08/2026 | [lyraos-desktop#170](https://github.com/lyra-os-linux/lyraos-desktop/pull/170) (mergeado) |
| [#60](https://github.com/lyra-os-linux/lyraos-desktop/issues/60) | [Desktop Alpha 6][P0] Investigar corrupção de dados Btrfs sob carga intensa | `bug`, `qa`, `stability` | — | 02/09/2026 | Não | Sim | Sim | 02/09/2026 | — |
| [#67](https://github.com/lyra-os-linux/lyraos-desktop/issues/67) | [P1][Instalador] Rejeitar delimitadores de protocolo nos dados de conta antes de particionar | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop#70](https://github.com/lyra-os-linux/lyraos-desktop/pull/70) (mergeado) |
| [#68](https://github.com/lyra-os-linux/lyraos-desktop/issues/68) | [P2][Instalador] Desmontar staging se a criação de subvolumes falhar parcialmente | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop#71](https://github.com/lyra-os-linux/lyraos-desktop/pull/71) (mergeado) |
| [#82](https://github.com/lyra-os-linux/lyraos-desktop/issues/82) | [GNOME][Leap 16.1][NVIDIA] Qualificar RPMs oficiais e acompanhar kernel/KMP | `bug`, `qa`, `stability`, `gnome` | — | 14/09/2026 | Não | Sim | Não planejada | 10/11/2026 | [lyra-vega-dbus#5](https://github.com/lyra-os-linux/lyra-vega-dbus/pull/5) (mergeado), [lyraos-desktop#83](https://github.com/lyra-os-linux/lyraos-desktop/pull/83) (mergeado), [lyraos-desktop#87](https://github.com/lyra-os-linux/lyraos-desktop/pull/87) (mergeado), [lyraos-server#22](https://github.com/lyra-os-linux/lyraos-server/pull/22) (mergeado), [vega#144](https://github.com/lyra-os-linux/vega/pull/144) (mergeado), [vega-cli#23](https://github.com/lyra-os-linux/vega-cli/pull/23) (mergeado), [vega-web#14](https://github.com/lyra-os-linux/vega-web/pull/14) (mergeado), [vegad#53](https://github.com/lyra-os-linux/vegad/pull/53) (mergeado) |
| [#89](https://github.com/lyra-os-linux/lyraos-desktop/issues/89) | [P1][Instalador] Tratar falha ao montar efivarfs em QEMU/KVM e firmware BIOS | `bug`, `desktop`, `qa`, `stability`, `gnome` | Alpha 8 — 30/10/2026 | 17/09/2026 | Não | Sim | Sim | 13/10/2026 | [lyraos-desktop#93](https://github.com/lyra-os-linux/lyraos-desktop/pull/93) (mergeado), [lyraos-desktop#146](https://github.com/lyra-os-linux/lyraos-desktop/pull/146) (mergeado), [lyraos-desktop#154](https://github.com/lyra-os-linux/lyraos-desktop/pull/154) (mergeado), [lyraos-desktop#159](https://github.com/lyra-os-linux/lyraos-desktop/pull/159) (mergeado), [lyraos-desktop#160](https://github.com/lyra-os-linux/lyraos-desktop/pull/160) (mergeado), [02ca433](https://github.com/lyra-os-linux/lyraos-desktop/commit/02ca4338f40104177d8e24369dff1726b2a3bcbb) |
| [#169](https://github.com/lyra-os-linux/lyraos-desktop/issues/169) | [GNOME][P4][Sessão] XDG_DATA_DIRS chega à sessão com barra final e gera avisos de serviço duplicado no dbus-broker | `bug`, `desktop`, `gnome` | — | 18/10/2026 | Não | Sim | Sim | 25/10/2026 | [lyraos-desktop#184](https://github.com/lyra-os-linux/lyraos-desktop/pull/184) (mergeado), [lyraos-desktop#187](https://github.com/lyra-os-linux/lyraos-desktop/pull/187) (mergeado), [5732668](https://github.com/lyra-os-linux/lyraos-desktop/commit/57326680071c6639adc3c67eb8a93753585b3726), [ab76d8a](https://github.com/lyra-os-linux/lyraos-desktop/commit/ab76d8a51080ee79204c00066ba3c5224e3fd594) |
| [#217](https://github.com/lyra-os-linux/lyraos-desktop/issues/217) | WebKitWebProcess aborta com corrupção de heap ao encerrar apps Tauri (Vega, Beam) | `bug`, `stability`, `gnome` | — | 28/10/2026 | Não | Sim | Sim | 06/11/2026 | — |
| [#218](https://github.com/lyra-os-linux/lyraos-desktop/issues/218) | Imagem não inclui iputils: ping/tracepath ausentes | `bug`, `packaging` | — | 28/10/2026 | Não | Sim | Sim | 28/10/2026 | [lyraos-desktop#219](https://github.com/lyra-os-linux/lyraos-desktop/pull/219) (mergeado) |
| [#228](https://github.com/lyra-os-linux/lyraos-desktop/issues/228) | [QA] live-gate.sh: a seção polkit lê a regra sem sudo e sempre falha | `bug`, `qa`, `future-release` | — | 30/10/2026 | Não | Sim | Sim | 06/11/2026 | [lyraos-desktop#529](https://github.com/lyra-os-linux/lyraos-desktop/pull/529) (mergeado) |
| [#514](https://github.com/lyra-os-linux/lyraos-desktop/issues/514) | SHELL-01: gnome-shell cai no login com placa de áudio sem perfis (libgvc) | `bug`, `packaging`, `stability`, `gnome` | 16.1-1 | 02/11/2026 | Não | Sim | Não planejada | 03/11/2026 | [lyraos-desktop#512](https://github.com/lyra-os-linux/lyraos-desktop/pull/512) (mergeado) |
| [#515](https://github.com/lyra-os-linux/lyraos-desktop/issues/515) | Instalador: subvolume @/var/lib/lyra-upgrade para o rollback guiado | `bug`, `stability` | 16.1-1 | 02/11/2026 | Não | Sim | Não planejada | 03/11/2026 | [lyraos-desktop#513](https://github.com/lyra-os-linux/lyraos-desktop/pull/513) (mergeado) |
| [#516](https://github.com/lyra-os-linux/lyraos-desktop/issues/516) | Updater 0.2.10: migrar /var/lib/lyra-upgrade para subvolume próprio no boot | `bug`, `packaging`, `stability` | 16.1-1 | 02/11/2026 | Não | Sim | Não planejada | 03/11/2026 | [lyraos-desktop-updater#32](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/32) (mergeado) |
| [#517](https://github.com/lyra-os-linux/lyraos-desktop/issues/517) | Updater 0.2.10: recusar Start quando o estado ainda está no subvolume raiz | `bug`, `stability` | 16.1-1 | 02/11/2026 | Não | Sim | Não planejada | 03/11/2026 | [lyraos-desktop-updater#32](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/32) (mergeado), [75292c4](https://github.com/lyra-os-linux/lyraos-desktop-updater/commit/75292c48c83e5d7f9c72c9b632ac6f9635d5c890) |
| [#522](https://github.com/lyra-os-linux/lyraos-desktop/issues/522) | Lyra Upgrade: códigos de pós-boot/rollback sem mensagem na interface | `bug` | — | 02/11/2026 | Não | Sim | Sim | 10/11/2026 | [lyraos-desktop-updater#34](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/34) (mergeado), [lyraos-desktop-updater#36](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/36) (mergeado) |
| [#523](https://github.com/lyra-os-linux/lyraos-desktop/issues/523) | Lyra Upgrade: updated_at não é atualizado pelo worker offline e pelo verificador | `bug` | — | 02/11/2026 | Não | Sim | Sim | 10/11/2026 | [lyraos-desktop-updater#35](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/35) (mergeado), [lyraos-desktop-updater#36](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/36) (mergeado) |
| [#524](https://github.com/lyra-os-linux/lyraos-desktop/issues/524) | Sessão live terminou sozinha depois de ociosa (RC 3, causa desconhecida) | `bug`, `qa` | — | 02/11/2026 | Não | Não | Não planejada | 10/11/2026 | — |
| [#530](https://github.com/lyra-os-linux/lyraos-desktop/issues/530) | Instalador: descoberta de discos roda lsblk como root pelo PATH | `bug` | — | 09/11/2026 | Não | Sim | Sim | 10/11/2026 | [lyraos-desktop#533](https://github.com/lyra-os-linux/lyraos-desktop/pull/533) (mergeado), [lyraos-desktop#534](https://github.com/lyra-os-linux/lyraos-desktop/pull/534) (mergeado) |
| [#531](https://github.com/lyra-os-linux/lyraos-desktop/issues/531) | Sistemas instalados e a ISO 16.1 final se identificam como "16.1 RC 3" | `bug` | — | 10/11/2026 | Não | Sim | Sim | 10/11/2026 | [lyraos-desktop#532](https://github.com/lyra-os-linux/lyraos-desktop/pull/532) (mergeado), [lyraos-desktop#537](https://github.com/lyra-os-linux/lyraos-desktop/pull/537) (mergeado) |

## lyraos-desktop-icons

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#1](https://github.com/lyra-os-linux/lyraos-desktop-icons/issues/1) | [P2][GNOME] Aplicar a cor de destaque às pastas especiais, incluindo Área de Trabalho | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [8fbe1cb](https://github.com/lyra-os-linux/lyraos-desktop-icons/commit/8fbe1cb705f9201343ed977a48ee66332c9a34ca) |

## lyraos-desktop-kde

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#3](https://github.com/lyra-os-linux/lyraos-desktop-kde/issues/3) | [P1][Instalador] Rejeitar delimitadores de protocolo nos dados de conta antes de particionar | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-kde#5](https://github.com/lyra-os-linux/lyraos-desktop-kde/pull/5) (mergeado) |
| [#4](https://github.com/lyra-os-linux/lyraos-desktop-kde/issues/4) | [P2][Instalador] Desmontar staging se a criação de subvolumes falhar parcialmente | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-kde#6](https://github.com/lyra-os-linux/lyraos-desktop-kde/pull/6) (mergeado) |

## lyraos-desktop-linuxtoys

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#9](https://github.com/lyra-os-linux/lyraos-desktop-linuxtoys/issues/9) | [P2][Automação] Retomar publicação staging após falha parcial | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-linuxtoys#11](https://github.com/lyra-os-linux/lyraos-desktop-linuxtoys/pull/11) (mergeado) |
| [#10](https://github.com/lyra-os-linux/lyraos-desktop-linuxtoys/issues/10) | [P2][Promoção] Fixar no submitrequest a revisão mostrada na confirmação | `bug` | Auditoria 2026.09 — Manutenção e qualidade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-linuxtoys#11](https://github.com/lyra-os-linux/lyraos-desktop-linuxtoys/pull/11) (mergeado), [lyraos-desktop-linuxtoys#13](https://github.com/lyra-os-linux/lyraos-desktop-linuxtoys/pull/13) (mergeado) |
| [#22](https://github.com/lyra-os-linux/lyraos-desktop-linuxtoys/issues/22) | Timer de atualização aponta para ~/Git/Lyra, e o workspace está em ~/Git/LyraOS | `bug` | — | 09/11/2026 | Não | Sim | Sim | 10/11/2026 | [lyraos-desktop-linuxtoys#23](https://github.com/lyra-os-linux/lyraos-desktop-linuxtoys/pull/23) (mergeado) |

## lyraos-desktop-sheliak

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#17](https://github.com/lyra-os-linux/lyraos-desktop-sheliak/issues/17) | [P2][Topbar] Reaplicar margem flutuante após carregar o estilo do painel | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [df9786e](https://github.com/lyra-os-linux/lyraos-desktop-sheliak/commit/df9786ee5d52404b428a30be014386bf46b94b8b) |
| [#18](https://github.com/lyra-os-linux/lyraos-desktop-sheliak/issues/18) | [P2][Acessibilidade] Ativar ícones de aplicativos pelo teclado e ação acessível | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-sheliak#22](https://github.com/lyra-os-linux/lyraos-desktop-sheliak/pull/22) (mergeado) |
| [#19](https://github.com/lyra-os-linux/lyraos-desktop-sheliak/issues/19) | [P2][Topbar] Evitar sobreposição da busca com o relógio em larguras reduzidas | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-sheliak#23](https://github.com/lyra-os-linux/lyraos-desktop-sheliak/pull/23) (mergeado) |
| [#34](https://github.com/lyra-os-linux/lyraos-desktop-sheliak/issues/34) | [GNOME][Bug] Lyra Panel/Dock acessam atores destruídos no encerramento da sessão | `bug`, `gnome` | — | 18/09/2026 | Não | Sim | Sim | 25/10/2026 | [lyraos-desktop-sheliak#35](https://github.com/lyra-os-linux/lyraos-desktop-sheliak/pull/35) (mergeado) |
| [#37](https://github.com/lyra-os-linux/lyraos-desktop-sheliak/issues/37) | [GNOME][Bug][P1] Dock aborta o GNOME Shell ao lançar aplicativo no primeiro login (sheliak 2.0.3, Alpha 8 candidata 3) | `bug`, `gnome` | — | 10/10/2026 | Não | Sim | Sim | 10/10/2026 | [lyraos-desktop-sheliak#38](https://github.com/lyra-os-linux/lyraos-desktop-sheliak/pull/38) (mergeado), [lyraos-desktop-sheliak#39](https://github.com/lyra-os-linux/lyraos-desktop-sheliak/pull/39) (mergeado) |

## lyraos-desktop-theme

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#11](https://github.com/lyra-os-linux/lyraos-desktop-theme/issues/11) | [P3][Manutenção] Corrigir wrapper de rollback que aponta para script removido | `bug` | Auditoria 2026.09 — Manutenção e qualidade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-theme#12](https://github.com/lyra-os-linux/lyraos-desktop-theme/pull/12) (mergeado) |
| [#22](https://github.com/lyra-os-linux/lyraos-desktop-theme/issues/22) | [GNOME][P3][LibreOffice] libreoffice-branding-Lyra não fornece intro-highres.png, shell/logo.svg e logo_inverted.svg (rpm -V libreoffice acusa 3 arquivos ausentes) | `bug`, `gnome` | — | 18/10/2026 | Não | Sim | Sim | 18/10/2026 | [lyraos-desktop#170](https://github.com/lyra-os-linux/lyraos-desktop/pull/170) (mergeado), [lyraos-desktop-theme#23](https://github.com/lyra-os-linux/lyraos-desktop-theme/pull/23) (mergeado) |
| [#27](https://github.com/lyra-os-linux/lyraos-desktop-theme/issues/27) | Perfil do GDM criado pelo install-rpm.sh não é removido ao desinstalar | `bug` | — | 09/11/2026 | Não | Sim | Sim | 10/11/2026 | [lyraos-desktop-theme#28](https://github.com/lyra-os-linux/lyraos-desktop-theme/pull/28) (mergeado), [lyraos-desktop-theme#29](https://github.com/lyra-os-linux/lyraos-desktop-theme/pull/29) (mergeado), [lyraos-desktop-theme#30](https://github.com/lyra-os-linux/lyraos-desktop-theme/pull/30) (mergeado) |

## lyraos-desktop-updater

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#5](https://github.com/lyra-os-linux/lyraos-desktop-updater/issues/5) | [P1][Solver] Fazer cumprir a política de troca de fornecedor | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-updater#13](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/13) (mergeado) |
| [#6](https://github.com/lyra-os-linux/lyraos-desktop-updater/issues/6) | [P1][Offline] Reutilizar metadados preparados e restaurar repos após falha de pré-aplicação | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-updater#13](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/13) (mergeado), [lyraos-desktop-updater#14](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/14) (mergeado) |
| [#7](https://github.com/lyra-os-linux/lyraos-desktop-updater/issues/7) | [P1][Planejamento] Manter invariantes do plano entre simulação e boot offline | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-updater#14](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/14) (mergeado), [lyraos-desktop-updater#15](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/15) (mergeado) |
| [#8](https://github.com/lyra-os-linux/lyraos-desktop-updater/issues/8) | [P1][Boot] Evitar espera circular no verificador iniciado pelo systemd | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-updater#16](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/16) (mergeado) |
| [#9](https://github.com/lyra-os-linux/lyraos-desktop-updater/issues/9) | [P1][Recuperação] Verificar a identidade de origem após rollback | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-updater#17](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/17) (mergeado) |
| [#10](https://github.com/lyra-os-linux/lyraos-desktop-updater/issues/10) | [P2][Verificador] Isolar estados inválidos ao procurar operações pendentes | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-updater#18](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/18) (mergeado), [lyraos-desktop-updater#19](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/19) (mergeado) |
| [#11](https://github.com/lyra-os-linux/lyraos-desktop-updater/issues/11) | [P2][Eventos] Manter o histórico legível ao atingir o limite de persistência | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-updater#20](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/20) (mergeado) |
| [#12](https://github.com/lyra-os-linux/lyraos-desktop-updater/issues/12) | [P2][Verificação] Impedir reparos de pacotes fora do plano na checagem pós-boot | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-updater#16](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/16) (mergeado), [lyraos-desktop-updater#17](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/17) (mergeado), [lyraos-desktop-updater#18](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/18) (mergeado), [lyraos-desktop-updater#19](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/19) (mergeado) |
| [#22](https://github.com/lyra-os-linux/lyraos-desktop-updater/issues/22) | [GNOME][Bug] Lyra Upgrade falha durante atualização offline do PackageKit | `bug`, `gnome` | — | 18/09/2026 | Não | Sim | Sim | 25/10/2026 | [lyraos-desktop#181](https://github.com/lyra-os-linux/lyraos-desktop/pull/181) (mergeado), [lyraos-desktop-updater#23](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/23) (mergeado), [lyraos-desktop-updater#25](https://github.com/lyra-os-linux/lyraos-desktop-updater/pull/25) (mergeado) |

## lyraos-desktop-welcome

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#2](https://github.com/lyra-os-linux/lyraos-desktop-welcome/issues/2) | [P3][Interface] Manter escolhas visuais consistentes quando gsettings falhar | `bug` | Auditoria 2026.09 — Manutenção e qualidade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-welcome#4](https://github.com/lyra-os-linux/lyraos-desktop-welcome/pull/4) (mergeado) |

## lyraos-desktop-xfce

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#3](https://github.com/lyra-os-linux/lyraos-desktop-xfce/issues/3) | [P1][Instalador] Rejeitar delimitadores de protocolo nos dados de conta antes de particionar | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-xfce#5](https://github.com/lyra-os-linux/lyraos-desktop-xfce/pull/5) (mergeado) |
| [#4](https://github.com/lyra-os-linux/lyraos-desktop-xfce/issues/4) | [P2][Instalador] Desmontar staging se a criação de subvolumes falhar parcialmente | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-desktop-xfce#6](https://github.com/lyra-os-linux/lyraos-desktop-xfce/pull/6) (mergeado) |

## lyraos-server

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#1](https://github.com/lyra-os-linux/lyraos-server/issues/1) | [Server Beta 1] Excluir a mídia live por identidade, não apenas por mountpoint | `bug`, `beta-1`, `server`, `stability` | — | 23/08/2026 | Não | Sim | Sim | 25/08/2026 | — |
| [#2](https://github.com/lyra-os-linux/lyraos-server/issues/2) | [Server Beta 1][P1] Remover interpolação da senha no shell do chroot | `bug`, `beta-1`, `server`, `stability` | — | 23/08/2026 | Não | Sim | Sim | 25/08/2026 | — |
| [#7](https://github.com/lyra-os-linux/lyraos-server/issues/7) | [P0][Server Beta 1] Impedir vazamento do checkout no SquashFS | `bug`, `beta-1`, `qa`, `server`, `stability` | Estabilização 2026.08 | 24/08/2026 | Não | Sim | Sim | 04/09/2026 | — |
| [#19](https://github.com/lyra-os-linux/lyraos-server/issues/19) | [P2][Instalador] Ativar limpeza desde a primeira montagem do destino | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [lyraos-server#20](https://github.com/lyra-os-linux/lyraos-server/pull/20) (mergeado) |
| [#31](https://github.com/lyra-os-linux/lyraos-server/issues/31) | [Server][P2][Vega] Imagem instala o vegad com VEGAD_PROFILE=desktop; consulta de atualizações tenta Flatpak e termina em erro | `bug`, `server` | — | 19/10/2026 | Não | Sim | Sim | 22/10/2026 | — |
| [#38](https://github.com/lyra-os-linux/lyraos-server/issues/38) | Atualização do Leap-release pode trocar a identidade do Server para openSUSE | `bug` | — | 30/10/2026 | Não | Sim | Não planejada | 10/11/2026 | [lyraos-server#39](https://github.com/lyra-os-linux/lyraos-server/pull/39) (mergeado), [9c49dba](https://github.com/lyra-os-linux/lyraos-server/commit/9c49dba334c9f935e39d1ae550ddf40170d91c5a) |

## sulafat

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#2](https://github.com/lyra-os-linux/sulafat/issues/2) | [P2][SSH] Preservar precedência de Include ao editar um host | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [sulafat#3](https://github.com/lyra-os-linux/sulafat/pull/3) (mergeado) |
| [#6](https://github.com/lyra-os-linux/sulafat/issues/6) | Tauri: WebKitWebProcess aborta com corrupção de heap ao fechar (mesmo bug do vega#166) | `bug`, `gnome` | — | 29/10/2026 | Não | Sim | Sim | 29/10/2026 | [sulafat#7](https://github.com/lyra-os-linux/sulafat/pull/7) (mergeado), [ac11f80](https://github.com/lyra-os-linux/sulafat/commit/ac11f801062cff04fbb027a20640604ffcd4e8fd) |
| [#10](https://github.com/lyra-os-linux/sulafat/issues/10) | Em release, um intervalo de 400 ms serializa o terminal inteiro sem parar | `bug` | — | 09/11/2026 | Não | Sim | Sim | 10/11/2026 | [sulafat#11](https://github.com/lyra-os-linux/sulafat/pull/11) (mergeado), [sulafat#12](https://github.com/lyra-os-linux/sulafat/pull/12) (mergeado) |

## vega

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#98](https://github.com/lyra-os-linux/vega/issues/98) | Contagem de pacotes pendentes não atualiza após 'Atualizar tudo' e sinal UpdatesAvailable é ignorado | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#99](https://github.com/lyra-os-linux/vega/issues/99) | Página de Serviços fica presa em 'carregando' se navegada antes do painel terminar de carregar | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#110](https://github.com/lyra-os-linux/vega/issues/110) | [i18n] Regerar o vega-gtk.pot a partir do código e traduzir o catálogo en de fato | `bug`, `enhancement`, `i18n` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#111](https://github.com/lyra-os-linux/vega/issues/111) | [i18n] Instalar os catálogos .mo nos pacotes (openSUSE/OBS) | `bug`, `enhancement`, `i18n` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#112](https://github.com/lyra-os-linux/vega/issues/112) | [Segurança][Systemd] Aplicar hardening aos serviços vegad e vega-web | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#114](https://github.com/lyra-os-linux/vega/issues/114) | [CI] Adicionar workflow para testes e análise estática | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#115](https://github.com/lyra-os-linux/vega/issues/115) | [Testes][Empacotamento] Validar RPM/OBS, unidades systemd e políticas | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#124](https://github.com/lyra-os-linux/vega/issues/124) | [P2][Privacidade] Apagar histórico mesmo com persistência desativada | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [vega#131](https://github.com/lyra-os-linux/vega/pull/131) (mergeado) |
| [#125](https://github.com/lyra-os-linux/vega/issues/125) | [P2][Formulários] Não pular coleta de dados ao desativar confirmações | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [vega#135](https://github.com/lyra-os-linux/vega/pull/135) (mergeado) |
| [#126](https://github.com/lyra-os-linux/vega/issues/126) | [P2][Personalização] Fixar cabeçalho durante rolagem e exibir ícone de Tema | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [677818b](https://github.com/lyra-os-linux/vega/commit/677818b2290d901e8ec696a9a650269f44ba6079) |
| [#166](https://github.com/lyra-os-linux/vega/issues/166) | Tauri: WebKitWebProcess aborta com corrupção de heap ao fechar o Vega (EGL Mesa+NVIDIA no mesmo processo) | `bug`, `gnome` | — | 28/10/2026 | Não | Sim | Sim | 28/10/2026 | [vega#167](https://github.com/lyra-os-linux/vega/pull/167) (mergeado) |
| [#178](https://github.com/lyra-os-linux/vega/issues/178) | Diagnóstico: teste recusado mostra o toast "Diagnóstico concluído" e esconde o motivo | `bug`, `gnome` | — | 31/10/2026 | Não | Sim | Sim | 31/10/2026 | [vega#179](https://github.com/lyra-os-linux/vega/pull/179) (mergeado), [10f56bd](https://github.com/lyra-os-linux/vega/commit/10f56bd4ad44f976caf5be9ee00ffdc5cdde0c39) |
| [#238](https://github.com/lyra-os-linux/vega/issues/238) | Liberar espaço: XDG_CACHE_HOME igual ao $HOME lista pastas pessoais como cache de aplicativo | `bug` | — | 05/11/2026 | Não | Sim | Sim | 10/11/2026 | [vega#247](https://github.com/lyra-os-linux/vega/pull/247) (mergeado), [vega#250](https://github.com/lyra-os-linux/vega/pull/250) (mergeado) |
| [#239](https://github.com/lyra-os-linux/vega/issues/239) | Liberar espaço: categoria desconhecida do vegad conta como segura e quebra "Limpar tudo" | `bug` | — | 05/11/2026 | Não | Sim | Sim | 10/11/2026 | [vega#248](https://github.com/lyra-os-linux/vega/pull/248) (mergeado) |
| [#240](https://github.com/lyra-os-linux/vega/issues/240) | Liberar espaço: checagem de pasta em uso falha quando o cache é acessado por link simbólico | `bug` | — | 05/11/2026 | Não | Sim | Sim | 10/11/2026 | [vega#249](https://github.com/lyra-os-linux/vega/pull/249) (mergeado) |
| [#241](https://github.com/lyra-os-linux/vega/issues/241) | Liberar espaço: política inconsistente para pastas ancestrais que são links (lixeira, miniaturas, cache) | `bug` | — | 05/11/2026 | Não | Sim | Sim | 10/11/2026 | [vega#250](https://github.com/lyra-os-linux/vega/pull/250) (mergeado) |
| [#242](https://github.com/lyra-os-linux/vega/issues/242) | Liberar espaço: tamanho dos runtimes Flatpak do usuário é superestimado | `bug` | — | 05/11/2026 | Não | Sim | Sim | 10/11/2026 | [vega#251](https://github.com/lyra-os-linux/vega/pull/251) (mergeado), [vegad#154](https://github.com/lyra-os-linux/vegad/pull/154) (mergeado), [vegad#156](https://github.com/lyra-os-linux/vegad/pull/156) (mergeado) |
| [#243](https://github.com/lyra-os-linux/vega/issues/243) | Liberar espaço: mensagens do backend sem tradução, rótulo em inglês duplicado e .pot desatualizado | `bug`, `i18n` | — | 05/11/2026 | Não | Sim | Sim | 10/11/2026 | [vega#247](https://github.com/lyra-os-linux/vega/pull/247) (mergeado), [vega#252](https://github.com/lyra-os-linux/vega/pull/252) (mergeado), [vega#255](https://github.com/lyra-os-linux/vega/pull/255) (mergeado) |
| [#245](https://github.com/lyra-os-linux/vega/issues/245) | IDs de transação colidem entre apps do Windows e atualização de firmware | `bug` | — | 09/11/2026 | Não | Sim | Sim | 10/11/2026 | [vega#253](https://github.com/lyra-os-linux/vega/pull/253) (mergeado), [vega#255](https://github.com/lyra-os-linux/vega/pull/255) (mergeado) |
| [#246](https://github.com/lyra-os-linux/vega/issues/246) | scripts/qa-packaging.sh falha: confere um arquivo que não existe mais | `bug` | — | 09/11/2026 | Não | Sim | Sim | 10/11/2026 | [vega#254](https://github.com/lyra-os-linux/vega/pull/254) (mergeado), [vega#255](https://github.com/lyra-os-linux/vega/pull/255) (mergeado) |

## vega-cli

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#19](https://github.com/lyra-os-linux/vega-cli/issues/19) | [P2][D-Bus] Preservar detalhes de erro fora de command substitutions | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [vega-cli#21](https://github.com/lyra-os-linux/vega-cli/pull/21) (mergeado) |
| [#20](https://github.com/lyra-os-linux/vega-cli/issues/20) | [P2][Transações] Aguardar o sinal da transação correta sem depender de sleep | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [vega-cli#21](https://github.com/lyra-os-linux/vega-cli/pull/21) (mergeado), [vega-cli#22](https://github.com/lyra-os-linux/vega-cli/pull/22) (mergeado) |

## vega-web

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#2](https://github.com/lyra-os-linux/vega-web/issues/2) | [Segurança][Web] Adicionar proteção contra força bruta no login PAM | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#3](https://github.com/lyra-os-linux/vega-web/issues/3) | [Segurança][Web] Expirar sessões e limitar o armazenamento em memória | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#4](https://github.com/lyra-os-linux/vega-web/issues/4) | [TLS][Web] Gerar certificado compatível com o endereço usado na LAN | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#5](https://github.com/lyra-os-linux/vega-web/issues/5) | [Testes][Web] Cobrir autenticação, sessões, TLS e integração PAM | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#7](https://github.com/lyra-os-linux/vega-web/issues/7) | [P1][Sessões] Encerrar terminais existentes no logout e na expiração | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [vega-web#10](https://github.com/lyra-os-linux/vega-web/pull/10) (mergeado) |
| [#8](https://github.com/lyra-os-linux/vega-web/issues/8) | [P2][Autorização] Vincular ações administrativas web à identidade autenticada | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [vega-web#11](https://github.com/lyra-os-linux/vega-web/pull/11) (mergeado), [vega-web#12](https://github.com/lyra-os-linux/vega-web/pull/12) (mergeado), [vega-web#13](https://github.com/lyra-os-linux/vega-web/pull/13) (mergeado) |
| [#34](https://github.com/lyra-os-linux/vega-web/issues/34) | Terminal: o helper root abre o shell sem conferir a senha e fica com PR_SET_DUMPABLE ligado | `bug` | — | 09/11/2026 | Não | Sim | Sim | 09/11/2026 | [vega-web#39](https://github.com/lyra-os-linux/vega-web/pull/39) (mergeado), [vega-web#40](https://github.com/lyra-os-linux/vega-web/pull/40) (mergeado), [vega-web#44](https://github.com/lyra-os-linux/vega-web/pull/44) (mergeado) |
| [#35](https://github.com/lyra-os-linux/vega-web/issues/35) | CSRF: POST /terminal e POST /logout não conferem o token da sessão | `bug` | — | 09/11/2026 | Não | Sim | Sim | 09/11/2026 | [vega-web#40](https://github.com/lyra-os-linux/vega-web/pull/40) (mergeado), [vega-web#44](https://github.com/lyra-os-linux/vega-web/pull/44) (mergeado), [47e7a38](https://github.com/lyra-os-linux/vega-web/commit/47e7a388eb7cc41c56616ecbd325f00a5cf27ce8) |
| [#36](https://github.com/lyra-os-linux/vega-web/issues/36) | RPM exige vegad >= 5.1.29, mas o painel precisa de recursos mais novos | `bug` | — | 09/11/2026 | Não | Sim | Sim | 09/11/2026 | [vega-web#41](https://github.com/lyra-os-linux/vega-web/pull/41) (mergeado), [vega-web#44](https://github.com/lyra-os-linux/vega-web/pull/44) (mergeado) |
| [#37](https://github.com/lyra-os-linux/vega-web/issues/37) | TLS: o painel não sobe depois de trocar o nome do host | `bug` | — | 09/11/2026 | Não | Sim | Sim | 09/11/2026 | [vega-web#42](https://github.com/lyra-os-linux/vega-web/pull/42) (mergeado), [vega-web#44](https://github.com/lyra-os-linux/vega-web/pull/44) (mergeado) |

## vegad

| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |
| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |
| [#20](https://github.com/lyra-os-linux/vegad/issues/20) | Snapshots (Timeshift) não lista os backups existentes | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#22](https://github.com/lyra-os-linux/vegad/issues/22) | vegad: Kernel.ApplyBootConfig falha com "permission denied" ao escrever /etc/default/grub | `bug`, `cli` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#23](https://github.com/lyra-os-linux/vegad/issues/23) | vegad: catálogo do firewall usa "printer" como nome de serviço, mas o firewalld não conhece esse ID (deveria ser "ipp") | `bug`, `cli` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#24](https://github.com/lyra-os-linux/vegad/issues/24) | vegad: DateTime.Status devolve "(unset)" como valor de teclado quando localectl não tem layout configurado | `bug`, `cli` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#25](https://github.com/lyra-os-linux/vegad/issues/25) | [Segurança][Backup] Impedir restauração replace de apagar caminhos arbitrários | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#26](https://github.com/lyra-os-linux/vegad/issues/26) | [Segurança][D-Bus] Restringir acesso aos logs executados como root | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#27](https://github.com/lyra-os-linux/vegad/issues/27) | [Testes][Backup] Cobrir validações destrutivas de restauração | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#28](https://github.com/lyra-os-linux/vegad/issues/28) | [Testes][D-Bus] Tornar executáveis os testes de integração com vegad real | `bug` | — | 23/08/2026 | Não | Sim | Sim | 23/08/2026 | — |
| [#39](https://github.com/lyra-os-linux/vegad/issues/39) | [P1][Segurança] Validar IDs Flatpak e autorizar mutações na instalação do sistema | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [vegad#50](https://github.com/lyra-os-linux/vegad/pull/50) (mergeado) |
| [#40](https://github.com/lyra-os-linux/vegad/issues/40) | [P1][Transações] Impedir encerramento por idle enquanto houver operação em andamento | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [vegad#50](https://github.com/lyra-os-linux/vegad/pull/50) (mergeado) |
| [#41](https://github.com/lyra-os-linux/vegad/issues/41) | [P1][Bootloader] Preservar parâmetros do GRUB como dados ao gravar configuração shell | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [vegad#50](https://github.com/lyra-os-linux/vegad/pull/50) (mergeado) |
| [#42](https://github.com/lyra-os-linux/vegad/issues/42) | [P2][Rede] Restaurar caracteres escapados ao interpretar a saída do nmcli | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | — |
| [#43](https://github.com/lyra-os-linux/vegad/issues/43) | [P2][Serviços] Propagar falhas de systemctl disable --now | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | — |
| [#44](https://github.com/lyra-os-linux/vegad/issues/44) | [P2][Bootloader] Gravar chaves novas de loader.conf com a sintaxe do systemd-boot | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [vegad#50](https://github.com/lyra-os-linux/vegad/pull/50) (mergeado) |
| [#45](https://github.com/lyra-os-linux/vegad/issues/45) | [P1][Repositórios] Vincular TrustRepoKey à chave efetivamente aprovada | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [vegad#116](https://github.com/lyra-os-linux/vegad/pull/116) (mergeado) |
| [#46](https://github.com/lyra-os-linux/vegad/issues/46) | [P1][Backup] Preservar arquivos até confirmar o sucesso da restauração replace | `bug` | Auditoria 2026.09 — Segurança e integridade | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [vegad#50](https://github.com/lyra-os-linux/vegad/pull/50) (mergeado) |
| [#47](https://github.com/lyra-os-linux/vegad/issues/47) | [P2][Backup] Desfazer ou retomar criação incompleta de configuração | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | — |
| [#48](https://github.com/lyra-os-linux/vegad/issues/48) | [P2][Backup] Executar on-connect uma vez por conexão do destino | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | — |
| [#49](https://github.com/lyra-os-linux/vegad/issues/49) | [P2][Usuários] Preservar metadados do AccountsService ao trocar a foto | `bug` | Auditoria 2026.09 — Funcionamento e recuperação | 05/09/2026 | Não | Sim | Sim | 10/09/2026 | [vegad#50](https://github.com/lyra-os-linux/vegad/pull/50) (mergeado) |
| [#99](https://github.com/lyra-os-linux/vegad/issues/99) | vegad-trusted-keys falha em todo update do vegad: %post inicia o serviço com o lock do RPM ainda preso | `bug` | — | 28/10/2026 | Não | Sim | Sim | 28/10/2026 | [vegad#100](https://github.com/lyra-os-linux/vegad/pull/100) (mergeado) |
| [#114](https://github.com/lyra-os-linux/vegad/issues/114) | Teste de pacotes: zypper ocupado vira "dependências não satisfeitas" | `bug` | — | 30/10/2026 | Não | Sim | Sim | 09/11/2026 | [vegad#134](https://github.com/lyra-os-linux/vegad/pull/134) (mergeado), [vegad#152](https://github.com/lyra-os-linux/vegad/pull/152) (mergeado) |
| [#124](https://github.com/lyra-os-linux/vegad/issues/124) | Cleanup: old-kernels informa bytes liberados que continuam presos nos snapshots | `bug` | — | 05/11/2026 | Não | Sim | Sim | 09/11/2026 | [lyra-ecosystem#71](https://github.com/lyra-os-linux/lyra-ecosystem/pull/71) (mergeado), [lyra-vega-dbus#22](https://github.com/lyra-os-linux/lyra-vega-dbus/pull/22) (mergeado), [vegad#144](https://github.com/lyra-os-linux/vegad/pull/144) (mergeado), [vegad#152](https://github.com/lyra-os-linux/vegad/pull/152) (mergeado) |
| [#128](https://github.com/lyra-os-linux/vegad/issues/128) | Services: nome de unit vai ao systemctl sem `--` e sem validação | `bug` | — | 09/11/2026 | Não | Sim | Sim | 09/11/2026 | [vegad#135](https://github.com/lyra-os-linux/vegad/pull/135) (mergeado), [vegad#152](https://github.com/lyra-os-linux/vegad/pull/152) (mergeado) |
| [#129](https://github.com/lyra-os-linux/vegad/issues/129) | CLI: argumento desconhecido ou incompleto cai no modo daemon | `bug` | — | 09/11/2026 | Não | Sim | Sim | 09/11/2026 | [vegad#136](https://github.com/lyra-os-linux/vegad/pull/136) (mergeado), [vegad#152](https://github.com/lyra-os-linux/vegad/pull/152) (mergeado) |
| [#130](https://github.com/lyra-os-linux/vegad/issues/130) | Export segue rodando sem o nome org.lyraos.Vega1 quando outro processo é o dono | `bug` | — | 09/11/2026 | Não | Sim | Sim | 09/11/2026 | [vegad#137](https://github.com/lyra-os-linux/vegad/pull/137) (mergeado), [vegad#152](https://github.com/lyra-os-linux/vegad/pull/152) (mergeado) |
| [#131](https://github.com/lyra-os-linux/vegad/issues/131) | Kernel.Install/Remove e ApplyBootConfig ignoram a trava de primeira atualização | `bug` | — | 09/11/2026 | Não | Sim | Sim | 09/11/2026 | [vegad#138](https://github.com/lyra-os-linux/vegad/pull/138) (mergeado), [vegad#152](https://github.com/lyra-os-linux/vegad/pull/152) (mergeado) |
| [#132](https://github.com/lyra-os-linux/vegad/issues/132) | Detecção de distro: restringir ao Leap (hoje aceita qualquer ID_LIKE suse/opensuse) | `bug` | — | 09/11/2026 | Não | Sim | Sim | 09/11/2026 | [vegad#143](https://github.com/lyra-os-linux/vegad/pull/143) (mergeado), [vegad#152](https://github.com/lyra-os-linux/vegad/pull/152) (mergeado), [aa4cdb5](https://github.com/lyra-os-linux/vegad/commit/aa4cdb554cc90332397415c2ddd5e98e63003783) |
| [#141](https://github.com/lyra-os-linux/vegad/issues/141) | Chaves confiáveis: espera pelo lock do RPM termina com erro genérico quando o prazo vence durante o rpmkeys | `bug` | — | 09/11/2026 | Não | Sim | Sim | 09/11/2026 | [vegad#142](https://github.com/lyra-os-linux/vegad/pull/142) (mergeado), [vegad#152](https://github.com/lyra-os-linux/vegad/pull/152) (mergeado) |
| [#146](https://github.com/lyra-os-linux/vegad/issues/146) | Snapshots: recusar o snapshot 0 do Snapper no próprio vegad | `bug` | — | 09/11/2026 | Não | Sim | Sim | 09/11/2026 | [vegad#147](https://github.com/lyra-os-linux/vegad/pull/147) (mergeado), [vegad#152](https://github.com/lyra-os-linux/vegad/pull/152) (mergeado) |
| [#148](https://github.com/lyra-os-linux/vegad/issues/148) | Kernel: instalar ou remover dá sucesso mesmo sem refazer o initrd e o GRUB | `bug` | — | 09/11/2026 | Não | Sim | Sim | 09/11/2026 | [vegad#149](https://github.com/lyra-os-linux/vegad/pull/149) (mergeado), [vegad#152](https://github.com/lyra-os-linux/vegad/pull/152) (mergeado) |
| [#150](https://github.com/lyra-os-linux/vegad/issues/150) | Diagnóstico: limite de 32 MiB da saída nunca funcionou, e o corte não é avisado | `bug` | — | 09/11/2026 | Não | Sim | Sim | 09/11/2026 | [vegad#151](https://github.com/lyra-os-linux/vegad/pull/151) (mergeado), [vegad#152](https://github.com/lyra-os-linux/vegad/pull/152) (mergeado) |
| [#153](https://github.com/lyra-os-linux/vegad/issues/153) | flatpak-unused: tamanho conta arquivos compartilhados com runtimes que ficam | `bug` | — | 10/11/2026 | Não | Sim | Sim | 10/11/2026 | [vegad#154](https://github.com/lyra-os-linux/vegad/pull/154) (mergeado) |
