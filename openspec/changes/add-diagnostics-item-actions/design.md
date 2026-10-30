# Design: corrigir item a item e "Já vi" nos logs

## Contrato (`lyra-vega-dbus`), capability `diagnostics-actions-v1`

- `Remedies(jobId u) -> a(sus)`: para cada achado com remédio do relatório
  `jobId` (0 = o mais recente), devolve `(stage, findingIndex, remedy)`. Só
  ids e índices, sem argumentos nem texto do journal; por isso é uma leitura
  pública intermediada, sem senha, como `Current`. É o que a lista de testes
  usa para saber onde mostrar **Corrigir**.
- `RepairFindings(jobId u, findings a(su)) -> repairJobId u`: conserta só os
  achados `(stage, findingIndex)` indicados, cada um com os próprios
  `remedyArgs` lidos do relatório gravado. Mesmo job, sinais, snapshot,
  reteste e erros do `Repair`. Polkit `org.lyraos.vega.hardware.repair`.
- `MarkLogsSeen(jobId u)`: grava como "visto desde" o momento em que o teste
  `logs` desse job terminou. Polkit `org.lyraos.vega.hardware.diagnose`
  (`auth_admin_keep`, o mesmo que roda o teste).

## vegad

- `RepairFindings` reaproveita o planejamento do `Repair`: em vez de juntar os
  argumentos de todos os achados com o mesmo remédio, junta só os dos achados
  indicados. Índice inexistente ou achado sem remédio: `NotSupported`.
- `MarkLogsSeen` grava `/var/lib/vega/diagnostics/logs-seen.json`
  (`{"seenUntil": <µs>}`, 0600). O teste `logs` passa a:
  - pedir os erros e os core dumps com `--since=@<seenUntil>`;
  - contar um serviço com falha só se `StateChangeTimestamp` for posterior;
  - pôr na métrica `seenUntil` a data usada.
- Não há estado novo em memória: o arquivo é a fonte da verdade, e o
  `vega-cli` e a futura verificação periódica enxergam o mesmo "visto".

## Vega

- Lista de testes: depois de um job e ao abrir a página, chama `Remedies` do
  último job. No item em Atenção ou Erro:
  - com remédio: **Corrigir**, que confirma listando os consertos e chama
    `RepairFindings` com os achados daquele teste;
  - sem remédio: **Ver o que fazer**, que abre o relatório.
- Relatório: o **Resolver** de cada achado passa a chamar `RepairFindings`
  com só aquele achado. Em daemons sem `diagnostics-actions-v1`, continua o
  comportamento atual (`Repair` por remédio).
- Achados do teste `logs` e o item Logs da lista: **Já vi**, que confirma
  ("os registros até agora deixam de contar"), chama `MarkLogsSeen` e roda o
  teste `logs` de novo.

## Alternativas descartadas

- **Guardar o "visto" só no Vega:** o `vega-cli` e a verificação periódica
  continuariam avisando do que o usuário já viu.
- **`systemctl reset-failed` como "já vi":** muda o estado do sistema e
  esconde o histórico de quem olhar depois. A data de corte não muda nada.
- **Mandar os argumentos do Vega para o vegad:** quebra a regra da fase 4 de
  só aceitar argumentos lidos do relatório gravado.
