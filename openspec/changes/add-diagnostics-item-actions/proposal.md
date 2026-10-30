# Proposta: corrigir item a item e "Já vi" nos logs do diagnóstico

## Por quê

Pedido do mantenedor em 29/10/2026, depois de usar o diagnóstico e o
Resolver na workstation:

> adicione em diagnóstico de saúde ajustar itens individualmente assim como
> posso executar separadamente. colocar o botão corrigir sempre que for
> preciso ao lado de atenção ou erro. nos logs de falha adicione também que
> já viu os logs para marcar como saudável

Hoje há três lacunas:

1. **O conserto só aparece dentro do relatório.** Na lista de testes, um
   item em Atenção ou Erro mostra o selo e "Executar", e nada mais. Para
   corrigir é preciso abrir o relatório, que pede a senha dos logs.
2. **O conserto não é item a item.** O "Resolver" de um achado aplica o
   remédio a todos os achados do mesmo tipo: fechar uma porta fecha todas as
   portas expostas, e reiniciar um serviço reinicia todos os que falharam.
3. **Os logs nunca ficam saudáveis.** Um core dump ou um serviço que falhou
   há dias continua marcando Atenção, mesmo depois que o usuário leu e
   entendeu. Sem um "já vi", o teste perde o valor: o amarelo vira paisagem.

## O que muda

1. **Corrigir na lista de testes.** Ao lado do selo Atenção ou Erro aparece
   **Corrigir** sempre que algum achado daquele teste tiver remédio. Sem
   remédio, aparece **Ver o que fazer**, que abre o relatório no achado.
2. **Corrigir item a item.** No relatório, cada achado com remédio tem o seu
   **Corrigir**, que conserta só ele (só aquela porta, só aquele serviço, só
   aqueles pacotes). "Resolver tudo o que for seguro" continua existindo.
3. **"Já vi" nos logs.** Os achados do teste `logs` (core dumps, serviços que
   falharam e erros) ganham **Já vi**. Depois dele, o teste `logs` só conta o
   que aconteceu depois desse momento, e ele roda de novo na hora: sem nada
   novo, fica Saudável. Um serviço que continua falhando volta a aparecer
   quando falhar de novo.

## Fora do escopo

- "Já vi" para outros testes. SMART, scrub e segurança mostram o estado atual
  e só melhoram com conserto, não com ciência.
- Desfazer o "Já vi" pela interface. O registro fica no vegad e pode ser
  apagado à mão (`/var/lib/vega/diagnostics/logs-seen.json`).

## Impacto

| Repositório | Mudança |
| --- | --- |
| `lyra-vega-dbus` | `Diagnostics.Remedies`, `Diagnostics.RepairFindings` e `Diagnostics.MarkLogsSeen`, com a capability `diagnostics-actions-v1` |
| `vegad` | Os três métodos; o teste `logs` respeita o "visto desde" |
| `vega` | Corrigir e Ver o que fazer na lista; Corrigir por achado; Já vi |

Nenhuma interface existente muda. Os nomes `diagnostics-v4` e `diagnostics-v5`
continuam reservados para o diagnóstico de rede e a análise de boot.

## Decisões

1. **Desfazer o "Já vi" pela interface:** fica de fora (mantenedor, 30/10/2026).
