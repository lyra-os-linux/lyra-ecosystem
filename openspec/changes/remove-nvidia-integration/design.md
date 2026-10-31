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

Achado de 31/10/2026: o `lyra-nvidia` usa o repositório **CUDA** da NVIDIA
(`developer.download.nvidia.com/compute/cuda/repos/suse16`), que já publica
`nvidia-open` 615.71.10, enquanto o KMP CUDA assinado no OSS do Leap continua
em 615.71.09. Tirar as exigências de versão com esse repositório ativo deixa
o solver escolher userspace 615.71.10 e, para casar, um módulo **sem
assinatura da SUSE** (`nvidia-open-driver-G07-kmp`, DKMS), o que quebra o
boot com Secure Boot. Por isso a versão de transição precisa ser decidida
com cuidado; as opções são:

1. **Migrar para o caminho padrão** (recomendado): o `lyra-nvidia` final
   troca o repositório CUDA pelo repositório gráfico
   (`download.nvidia.com/opensuse/leap/16.1`) e exige
   `nvidia-open-driver-G07-signed-kmp-meta` (KMP assinado do OSS, hoje
   595.99.02). É um *downgrade* do driver 615 para 595, feito pelo `zypper`
   na atualização; exige qualificação em VM e no notebook de referência.
2. **Congelar**: o `lyra-nvidia` final mantém o repositório CUDA e as
   exigências, e só deixa de ser atualizado. Quando a SUSE trocar a versão do
   KMP CUDA, a máquina fica sem módulo para o kernel novo.

## Guia para quem não usa o Vega

O texto publicado nas Discussions (#234, #366) e no site segue o openSUSE com
uma diferença: **não** recomenda o `openSUSE-repos-Leap-NVIDIA`, porque ele
depende do `openSUSE-repos-Leap`, que renomeia `repo-oss.repo` e
`repo-non-oss.repo` e recria os repositórios como serviço com prioridade 99.
No Lyra isso faria os repositórios do Lyra (90) ganharem dos oficiais. O guia
adiciona o mesmo repositório gráfico direto (`zypper addrepo`), com a chave
`2FB0 3195 DECD 4949 2BD1 C17A B1D0 D788 DB27 FD5A`, e instala
`nvidia-open-driver-G07-signed-kmp-meta` (Turing e mais novas) ou
`nvidia-driver-G06-kmp-meta` (Maxwell/Pascal). O G06 registra uma chave MOK
com a senha de root, bloqueada no Lyra; com Secure Boot, o guia manda
desligá-lo antes do G06. Notebooks híbridos pré-Ampere recebem a linha do
`60-lyra-nvidia-pm.conf` (`NVreg_DynamicPowerManagement=0x02`) como passo
manual.

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
