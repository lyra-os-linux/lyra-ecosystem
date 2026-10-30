# Design: diagnóstico no `vega-cli`

- **Padrão do `vega-cli`:** `busctl --json=short` + `jq` (`lib/dbus.sh`),
  `dialog` (`lib/ui.sh`), autorização pelo `pkttyagent`. Um módulo novo,
  `lib/diagnostics.sh`, chamado de Hardware e Kernel e do `bin/vega` (resumo).
- **Progresso:** `Start` devolve o job; o módulo consulta `Current` a cada
  segundo e alimenta um `dialog --gauge` (etapa e percentual). Sem assinar
  sinais: o job pode terminar antes da resposta (o mesmo motivo da correção
  do Vega em 30/10), e o `Current` voltando a 0 encerra a espera.
- **Relatório:** `Report(job, redact=false)` em JSON, mostrado num
  `dialog --textbox` montado com `jq` (resultado por teste, achados de atenção
  e falha, a orientação). Pelo SSH, `logs.read-admin` pede a senha uma vez e
  retém (`AUTH_SELF_KEEP`).
- **Corrigir:** `Remedies(job)` dá os achados com conserto; um
  `dialog --checklist` escolhe; `RepairFindings` aplica e o progresso segue o
  mesmo `Current`.
- **Resumo ao abrir:** `LastPeriodic()`; o último job avisado fica em
  `~/.local/state/vega-cli/periodic-seen`, por usuário. Sem novidades novas,
  nada aparece.
- **Rede:** `Start(["network"])` e o `Report` do job, sem senha também pelo
  SSH (regra nova); os passos vêm da métrica `steps`.
- **Liberar espaço:** `Cleanup.Scan` (sem senha pelo SSH com a regra nova)
  num `dialog --checklist` com o tamanho de cada categoria; os "seguros" já
  vêm marcados e `old-kernels`/`snapshots` desmarcados, como no Vega. Uma
  confirmação lista o que sai; `Clean` roda como job e o fim mostra o total
  liberado (`CategoryFinished`/`Finished` pelo `transaction.py`, que já
  acompanha os sinais das transações).
- **Testes:** o `tests/busctl-fixture.py` ganha as respostas do
  `Diagnostics`, e o `tests/test-dbus.sh` cobre o resumo, a lista, o relatório
  e o checklist do conserto.
