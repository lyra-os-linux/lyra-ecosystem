# Proposta: diagnóstico e verificação semanal no `vega-cli` (Server)

## Por quê

Pedido do mantenedor em 30/10/2026: o `vega-cli` do Server entra na RC 3.

O vegad 5.6.1 já roda no Server o diagnóstico de saúde, o teste de rede, a
análise de boot, os consertos e a verificação semanal (o timer está ligado
também no perfil `server`). Mas o administrador que entra por SSH não vê
nada disso: o `vega-cli` não tem as telas, e o resumo da verificação semanal
no login ficou pendente na add-periodic-checks (tarefa 4.2).

## O que muda

1. **Resumo da verificação semanal ao abrir o `vega`:** se a última execução
   periódica teve novidades que este usuário ainda não viu, uma janela mostra
   a data, a quantidade e os textos das novidades antes do menu principal,
   com a opção de abrir o relatório.
2. **Diagnóstico de saúde** em Hardware e Kernel:
   - a lista dos testes com o último resultado de cada um;
   - executar o modo Rápido ou um teste só, com barra de progresso;
   - o relatório: o resultado por teste e os achados de atenção e falha, com
     a orientação;
   - **Corrigir:** escolher os achados com conserto numa lista e aplicar só
     esses (`RepairFindings`);
   - **Já vi** nos logs (`MarkLogsSeen`);
   - ligar, desligar e mudar a frequência da verificação periódica.
3. **Minha internet não funciona** em Rede e Firewall: o teste `network`,
   passo a passo, com o conserto quando houver.
4. **Liberar espaço** em Armazenamento: as categorias do sistema do `Cleanup`
   (core dumps, journal, cache do zypper, Flatpak sem uso, kernels antigos e
   a limpeza do Snapper), com o tamanho, a confirmação e o total liberado.
   As categorias da pasta pessoal ficam no Vega gráfico: num servidor, o que
   pesa é o sistema.
5. **vegad:** a regra `50-vegad-remote-admin` passa a liberar em silêncio,
   para membros de `wheel` em sessão remota, as leituras novas que o desktop
   já faz sem senha: `hardware.read-admin` (resultado periódico),
   `storage.read-admin` (medição de espaço) e `network.diagnose` (teste de
   rede e o relatório dele).

## Fora do escopo

- O teste de GPU e os testes de carga com telemetria ao vivo: o Server roda o
  modo Rápido e testes avulsos; a carga pode ser escolhida, mas sem os
  gráficos.
- O `vega-web`.
- As categorias de limpeza da pasta pessoal (lixeira, miniaturas, `~/.cache`).

## Impacto

| Repositório | Mudança |
| --- | --- |
| `vega-cli` | Resumo ao abrir, Diagnóstico de saúde, Minha internet não funciona, Liberar espaço; testes com o fixture do `busctl` |
| `vegad` | Regra remota com as três leituras silenciosas (vegad 5.6.2) |
| `lyraos-server` | Notas da RC 3 e o gate passa a cobrir o diagnóstico pelo SSH |

Nenhuma interface D-Bus muda.

## Decisões

1. **Liberar espaço no `vega-cli`:** entra (mantenedor, 30/10/2026).
