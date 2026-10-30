# Proposta: diagnóstico, Liberar espaço e Pedir ajuda no `vega-web` (Server)

## Por quê

Pedido do mantenedor em 30/10/2026, durante o gate da RC 3 do Server: levar
ao `vega-web` o que o Vega e o `vega-cli` já ganharam. A decisão é que isso
entra **na RC 3** (exceção ao congelamento): a ISO do Server é refeita e o
gate é repetido.

O vegad 5.6.2 já serve tudo no perfil `server`, mas o painel web 5.1.25 não
tem nenhuma das telas. O administrador que usa o navegador fica sem o
diagnóstico, a verificação semanal, o teste de rede e a limpeza.

## O que muda

1. **Diagnóstico de saúde** em Hardware e Kernel (`/hardware/diagnostico`):
   - a lista dos testes com o último resultado de cada um, sem senha;
   - executar o modo Rápido ou um teste só, com a etapa e o percentual;
   - o relatório: o resultado por teste, os achados de atenção e falha com a
     orientação, os passos da rede e o tempo de boot por fase (o teste
     `boot`, da add-boot-analysis);
   - **Corrigir:** escolher os achados com conserto e aplicar só esses
     (`RepairFindings`);
   - **Já vi** nos logs (`MarkLogsSeen`);
   - a verificação periódica: o estado atual sem senha; ligar, desligar e
     mudar a frequência com senha;
   - **a última verificação semanal:** a data, a quantidade e os textos das
     novidades, e o caminho para o relatório dela.
2. **Minha internet não funciona** em Rede e Firewall: o teste `network`
   passo a passo, com o conserto quando houver.
3. **Liberar espaço** em Armazenamento: as categorias do sistema do
   `Cleanup`, com o tamanho, a escolha, a confirmação e o total liberado.
4. **Pedir ajuda** a partir do relatório: o texto **redigido** do
   diagnóstico, a descrição do usuário e os botões para as Discussions e para
   uma issue no GitHub, como no Vega (add-help-report).
5. **Painel inicial:** um cartão com o estado da verificação semanal
   (ligada, frequência) e o atalho para o diagnóstico.

## Fora do escopo

- O teste de GPU e os gráficos dos testes de carga: num servidor sem tela,
  rodam o modo Rápido e os testes avulsos, como no `vega-cli`.
- As categorias da pasta pessoal (lixeira, miniaturas, `~/.cache`): o painel
  web administra o sistema, e a conta HTTPS não tem pasta do usuário.
- Mudar o modelo de autorização do painel (uma senha por ação, ver o design).
- O Desktop: a ISO do Desktop não leva o `vega-web`.

## Impacto

| Repositório | Mudança |
| --- | --- |
| `vega-web` | Páginas novas, operações novas no broker, pin do `lyra-vega-dbus`, testes; versão 5.2.0 |
| `lyraos-server` | Mínimo do `vega-web` 5.2.0, notas da RC 3, novo build e o gate inteiro de novo |
| `vegad` | Nenhuma, se a qualificação em VM confirmar as políticas atuais (ver o design) |
| `lyra-vega-dbus` | Nenhuma: o `vega-web` passa a fixar o mesmo commit do `vega-gtk` (`7333f57`) |

Nenhuma interface D-Bus muda.

## Decisões

1. **Entra na RC 3:** sim (mantenedor, 30/10/2026). Novo build do Server e
   gate completo.
2. **Escopo:** diagnóstico de saúde, Liberar espaço, Minha internet não
   funciona, tempo de boot e Pedir ajuda (mantenedor, 30/10/2026).
3. **Senha:** uma por ação (mantenedor, 30/10/2026). Mantém a regra do painel,
   e o teste de rede vira uma operação só, com uma senha (ver o design).
