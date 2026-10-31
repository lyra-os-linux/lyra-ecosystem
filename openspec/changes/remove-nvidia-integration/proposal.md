# Proposta: retirar a integração NVIDIA do Vega

## Por quê

Pedido do mantenedor em 31/10/2026: tirar do Vega a instalação do driver
NVIDIA, em todas as partes (`vegad`, `vega-gtk`, `vega-web` e `vega-cli`),
**incluindo o pacote `lyra-nvidia`**.

Hoje o Vega instala o driver oficial (capacidade `nvidia-official-v1`),
mostra o estado da pilha NVIDIA, cria um ponto de recuperação antes da
instalação (`nvidia-recovery-v1`, com Restic no Server/ext4) e reconcilia a
política de suspensão NVIDIA no início do daemon. O `lyra-nvidia` fixa as
bibliotecas e o KMP numa versão qualificada (615.71.09). Tudo isso exige
requalificação a cada versão de driver e de kernel.

## O que muda

1. **Contrato (`lyra-vega-dbus`):** `InstallNvidia`, `NvidiaStatus`,
   `NvidiaRecovery` e `CheckNvidia` passam a ser **aposentados**, como já é o
   `SwitchNvidiaDriver`: ficam no XML com `Deprecated=true` e sempre devolvem
   `org.freedesktop.DBus.Error.NotSupported`. As capacidades
   `nvidia-official-v1` e `nvidia-recovery-v1` saem de `Metadata.Capabilities`.
   O crate cliente deixa de expor esses métodos.
2. **`vegad`:** sai a instalação, o diagnóstico, a recuperação
   (`internal/nvidiarecovery`, subcomando `vegad nvidia-recover`), a
   reconciliação da suspensão no início, os textos de i18n e a documentação.
   Sai também `packaging/lyra-nvidia/`.
3. **`vega-gtk`:** sai o cartão/página NVIDIA de Hardware e as ações
   `InstallNvidia`.
4. **`vega-web`:** sai `/hardware/nvidia`, a operação `InstallNvidia` do
   broker e do helper administrativo.
5. **`vega-cli`:** sai Hardware e Kernel → NVIDIA (`lib/nvidia.sh`).
6. **`lyra-nvidia`:** uma última versão de transição (ver design) e depois
   o fim da manutenção no OBS.
7. **Edições e site:** `lyraos-desktop` e `lyraos-server` deixam de prometer
   a instalação pelo Vega e passam a apontar o procedimento oficial do
   openSUSE para NVIDIA.

## Fora do escopo

- A detecção genérica da GPU no inventário de Hardware e o uso da GPU no
  monitor (`nvidia-smi`, quando existir): funcionam com qualquer driver
  instalado pelo usuário e não instalam nada.
- O teste de desempenho gráfico (`gpu_bench.rs`) e a menção a módulos
  NVIDIA como esperados no diagnóstico da plataforma.
- `lyraos-desktop/scripts/install-nvidia-g06.sh` (script manual, fora do
  Vega). Fica para uma decisão separada.
- Notas de versão antigas (histórico).

## Impacto

- Quem já instalou pelo Vega mantém a pilha NVIDIA, mas perde o
  diagnóstico, a recuperação pelo Vega e a manutenção do `lyra-nvidia`.
  O design trata essa migração; é o principal risco desta mudança.
- Mudança incompatível no contrato: coordenar todos os consumidores
  declarados no `products.toml` (`vega`, `vega-web`, `vega-cli`).
- A ISO do Desktop 16.1 não traz NVIDIA e contava com o Vega para isso;
  quem tiver NVIDIA passa a seguir o procedimento do openSUSE.
