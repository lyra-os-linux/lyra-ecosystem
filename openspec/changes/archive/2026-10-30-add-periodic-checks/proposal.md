# Proposta: verificação periódica com aviso

## Por quê

O diagnóstico só ajuda quem lembra de abrir o Vega. Os problemas que mais
custam vêm devagar e em silêncio: o disco se desgastando, uma porta que passou
a ficar exposta, uma correção de segurança esquecida há semanas, um serviço
que começou a falhar, o disco quase cheio. O Vega deveria **avisar antes**, e
só quando algo **mudou**, sem virar uma fonte de alertas que o usuário aprende
a ignorar.

## O que muda

- **Toda semana**, o vegad roda em segundo plano um conjunto leve e somente de
  leitura: `disk-health`, `logs`, `platform`, `security` e, quando existir, o
  espaço livre. Nada de carga, scrub ou benchmark.
- O resultado é **comparado com o da semana anterior**. Só gera aviso o que é
  **novo ou piorou**:
  - um achado de atenção ou falha que não existia;
  - o SMART com `percentUsed` subindo mais de 5 pontos em 30 dias;
  - patches de segurança pendentes há mais de 7 dias.
- O aviso é uma **notificação do GNOME** ("O Vega encontrou 2 novidades na
  saúde do sistema"). Clicar abre o relatório no Vega, onde o Resolver
  funciona como sempre.
- Uma opção em Preferências liga ou desliga a verificação, que vem **ligada**,
  e escolhe a frequência: semanal (padrão) ou diária.

## Fora do escopo

- Limpar ou reparar sozinho. A verificação só avisa; o usuário decide.
- Avisar por e-mail (para o Server, fica para depois).

## Impacto

| Repositório | Mudança |
| --- | --- |
| `vegad` | Timer systemd com o job leve, a comparação com o relatório anterior e o estado `/var/lib/vega/diagnostics/periodic.json` |
| `lyra-vega-dbus` | O sinal `Diagnostics.Novelties(jobId, count)` e a leitura `LastPeriodic()`; capability `diagnostics-periodic-v1` |
| `vega` | O notificador da sessão (o mesmo do `vega-update-notifier`) e a opção em Preferências |
| `lyraos-server` | Por padrão, o mesmo timer sem notificação gráfica: o resultado fica no relatório e no `vega-cli` |

## Questões abertas

1. **Frequência padrão:** semanal (proposta) ou diária.
