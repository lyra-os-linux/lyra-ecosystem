# Plano de bugs — 10/11/2026

Regras do dia:

- Bug se resolve **sem EGM**. Se um item virar melhoria, ele sai do plano e vai para o EGM.
- As decisões são do mantenedor, uma pergunta por vez.
- Cada issue tem branch e PR próprios.
  - Código empacotado no OBS: o PR usa `Refs #N`, e a issue só fecha depois da publicação no OBS.
  - Código fora do OBS: o PR usa `Closes #N`.
- Rodar `python3 relatorios/gerar_relatorios.py` sempre que abrir ou fechar uma issue.
- Antes de corrigir, conferir no código que o defeito ainda existe.

## Bloco 0 — Abertura

1. Conferir se vega-web #42 e #43 foram mergeados. #40 e #41 já estão na `main`. O #42 caiu por falha do espelho do Tumbleweed e o job foi reexecutado.
2. Perguntas ao mantenedor:
   1. Versão do vega-web: 6.0.0 ou 5.4.0. A 6.0.0 foi escolhida quando a #19 estava no escopo.
   2. Envio único ao OBS:
      - tags `v5.10.0` do vegad e `v5.4.0` do lyra-vega-dbus;
      - staging do vegad e do vega-web;
      - vega-gtk entra no mesmo lote se o Bloco 2 terminar;
      - teste na VM e promoção.
3. Depois da publicação, fechar com evidência:
   - vegad #114, #124, #126, #128–#132, #141, #146, #148, #150;
   - vega-web #27, #34–#37.

## Bloco 1 — Segurança

- **beam#11**: `rsakeys.ini` está versionado no repo. Nunca exibir o conteúdo da chave. Perguntas ao mantenedor:
  1. A chave é usada por algum servidor xrdp? Se for, precisa ser rotacionada.
  2. Remover o arquivo e incluir no `.gitignore`. Reescrever o histórico ou não?

## Bloco 2 — vega-gtk: Liberar espaço do usuário

Pré-requisito: instalar `dbus-1-devel` (e `jq`) num terminal com sudo, para compilar e testar localmente.

| Issue | Defeito | Decisão necessária? |
| --- | --- | --- |
| #238 | `XDG_CACHE_HOME` igual a `$HOME` (o mais grave) | não |
| #239 | categoria desconhecida tratada como segura | não |
| #240 | checagem de "em uso" seguindo symlink | não |
| #241 | política para ancestrais com link | **sim** |
| #242 | estimativa de tamanho do Flatpak | **sim** (abordagem) |
| #243 | mensagens do backend em pt para en/es, rótulo "Open Free up space", `.pot` 4.0.3 | não |
| #245 | colisão de `NEXT_ID` | não |
| #246 | `qa-packaging.sh` | não |

Fechar com a versão nova do vega (hoje 5.13.1) no lote do OBS.

## Bloco 3 — Lyra Upgrade e instalador (lyraos-desktop)

- **#522**: `ui/errors.js` não tem 14 códigos (`POST_BOOT_FAILED_UNITS`, `ROLLBACK_FAILED`, `OFFLINE_APPLY_FAILED`, `POST_BOOT_VERIFICATION_TIMEOUT`…).
  - Incluir as mensagens em en-US, pt-BR e es-ES.
  - Criar um teste que compare os códigos emitidos com o catálogo.
- **#523**: o verifier e o worker offline não atualizam `updated_at` nas transições.
- **#530**: usar caminhos absolutos para `lsblk`, `vgs` e `lvs`.

## Bloco 4 — Server e contrato

- **lyraos-server#38**: a identidade em `/etc/os-release` é sobrescrita por atualização do `Leap-release`. Pergunta: trazer o mecanismo do `lyra-release` do Desktop para o Server?
- **lyra-vega-dbus#21**:
  - o CI deve comparar as **assinaturas**, não só os nomes;
  - o teste ao vivo não pode aceitar `AuthorizationFailed` como sucesso.

## Bloco 5 — Pequenos

- **lyraos-desktop-linuxtoys#22**: caminho do timer.
- **lyraos-desktop-theme#27**: marcador do GDM.
- **sulafat#10**: hooks de desenvolvimento no build de release.

## Bloco 6 — Investigação (só se sobrar tempo)

- **lyraos-desktop#524**: a sessão live cai por ociosidade. Precisa reproduzir com `systemd.journald.forward_to_console=1 console=ttyS0`.
- **#22 e #82 (NVIDIA)**: dependem de hardware físico, o mantenedor decide quando.

## Fora do dia (EGM ou decisão pendente)

- vega-web #19 e #25, e o `deferred` no Liberar espaço.
- vegad #145, #122 e #123.
- Brainstorm da loja (parado na pergunta 4).
- `EGM.md`: commitar ou apagar.
- Seção "Driver NVIDIA" desatualizada no README do vega-web.
