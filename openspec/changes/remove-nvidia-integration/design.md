# Design: retirar a integração NVIDIA do Vega

## Ordem

Contrato → `vegad` → frontends, como no `contracts.toml`. Os frontends novos
precisam funcionar com um `vegad` antigo (o `vegad` é atualizado por outro
RPM): eles simplesmente deixam de oferecer NVIDIA, sem depender da ausência
das capacidades.

## Contrato

Seguir o precedente do `SwitchNvidiaDriver`: os métodos continuam no XML do
v1, marcados `org.freedesktop.DBus.Deprecated`, e o `vegad` responde
`NotSupported` sem autorização, sem worker de consulta e sem tocar no
sistema. Assim um frontend antigo com um `vegad` novo recebe um erro
tratável, e não "método desconhecido". O crate cliente remove os métodos e os
tipos `NvidiaStatus`/`NvidiaRecovery` (nova tag; os consumidores atualizam o
pin com `scripts/check-consumer-pin.sh`).

## `vegad`

- Remover `internal/dbusserver/nvidia*.go`, `internal/distro/nvidia*.go`,
  `internal/nvidiarecovery/`, os testes correspondentes, o subcomando
  `nvidia-recover` e a chamada a `ReconcileNvidiaSuspendPolicy`.
- Ajustar `readonly.go`/`query_policy.go`: os métodos aposentados não
  passam mais pelo worker com a exceção de `ProtectKernelModules`; essa
  exceção sai da unidade systemd.
- Política de suspensão: o `vegad` deixa de reconciliar. Os drop-ins já
  criados pelo Lyra ficam como estão (são do administrador a partir daí) e a
  documentação explica como removê-los. Não apagar nada na atualização.
- Remover `docs/nvidia.md`, a capacidade nos perfis, os textos de i18n e as
  checagens em `check-packaging-contracts.sh` e nos specs.

## Quem já instalou (migração)

O `lyra-nvidia` exige bibliotecas e KMP na versão 615.71.09. Se ele ficar
instalado sem manutenção, a próxima atualização de kernel do Leap que trouxer
outra versão do KMP assinado vai **travar o `zypper` com conflito de
dependências**. Por isso não basta apagar o pacote do OBS.

Proposta: publicar um **`lyra-nvidia` final de transição** que:

- tira as exigências de versão (bibliotecas, KMP) e os conflitos;
- mantém o repositório oficial NVIDIA com verificação de assinatura e o
  `60-lyra-nvidia-pm.conf`, para a máquina continuar funcionando e
  atualizando pelos metapacotes do openSUSE/NVIDIA;
- não executa nada em scriptlets.

Depois de um período com essa versão publicada, o pacote sai do OBS. Ele
continua instalado nas máquinas, inofensivo, e pode ser removido com o
`zypper`. A recuperação offline (`vegad nvidia-recover`) deixa de existir:
pontos de recuperação já criados continuam no disco e podem ser restaurados
manualmente com o `restic`, como a documentação do Server vai explicar.

**A validar antes de executar:** quais metapacotes NVIDIA do Leap 16.1
mantêm KMP e userspace em sincronia sem o `lyra-nvidia`, numa VM com a pilha
615.71.09 instalada pelo Vega, passando por uma atualização de kernel.

## Frontends

- **`vega-gtk`:** remover `software_nvidia_status`, a ação `InstallNvidia`,
  o cartão NVIDIA em `hardware.js`, as referências em
  `hardware-diagnostics.js`, o CSS e as strings dos `.po`.
- **`vega-web`:** remover `pages/nvidia.rs`, as rotas, `nvidia_jobs` do
  estado, `Operation::InstallNvidia` do IPC e do helper. O código de
  operação `3` do IPC fica **reservado** (não reaproveitar) e é recusado.
- **`vega-cli`:** remover `lib/nvidia.sh`, o item do menu de Hardware, o
  timeout especial em `dbus.sh` e os casos em `transaction.py` e nos testes.

## Edições e site

- `lyraos-desktop`: README, `docs/nvidia-iso.md`, `docs/status-gnome.md` e o
  gate de release deixam de citar a instalação pelo Vega e apontam o guia
  oficial do openSUSE.
- `lyraos-server`: `docs/nvidia-recovery.md` vira "como restaurar um ponto
  antigo"; o comentário do `restic` no `kiwi/config.xml` passa a citar só os
  backups do Vega (o pacote continua).
- `site`: a página de documentação que orienta NVIDIA; notas antigas ficam.

## Reversão

Cada repositório volta pela tag anterior no OBS (staging = release). O
`lyra-nvidia` de transição não altera o sistema além das dependências, então
voltar à versão anterior é um `zypper install --oldpackage`.
