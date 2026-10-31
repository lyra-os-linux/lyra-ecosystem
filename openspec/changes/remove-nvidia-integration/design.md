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

Decisão de 31/10/2026: o `lyra-nvidia` foi **descontinuado**, e os projetos
`home:rodrigosbrito:nvidia` e `nvidia:staging` foram apagados do OBS. Quem
instalou o driver pelo Vega migra à mão para o caminho do guia, numa única
transação do `zypper`:

```bash
sudo zypper removerepo lyra-nvidia
sudo zypper addrepo --refresh https://download.nvidia.com/opensuse/leap/16.1 repo-nvidia
sudo zypper refresh repo-nvidia
sudo zypper install --allow-downgrade --allow-vendor-change nvidia-open-driver-G07-signed-kmp-meta -lyra-nvidia -nvidia-open -nvidia-open-driver-G07-signed-cuda-kmp-default
```

Por que não uma versão de transição automática:

- O pacote não pode exigir o metapacote do repositório gráfico, porque esse
  repositório só existiria depois de ele mesmo ser instalado, e o `zypper up`
  não faz o *downgrade* de 615 para 595.
- A versão sem as travas seria segura (os `Conflicts` contra
  `nvidia-open-driver-G07-kmp` já bloqueiam o módulo DKMS sem assinatura), mas
  manteria um pacote e um projeto OBS só para essas máquinas. O mantenedor
  preferiu excluir.

Validação (31/10/2026), num chroot Leap 16.1 com `zypper --root`: o estado do
Vega foi recriado (`lyra-nvidia` 615.71.09, KMP CUDA assinado, repositórios
`lyra-nvidia` e `lyra-nvidia-upstream`); nesse estado o `zypper up` já segurava
8 atualizações NVIDIA. As variantes sem `--allow-downgrade` e
`--allow-vendor-change` falham (`nvidia-modprobe` e `nvidia-persistenced` mudam
de fornecedor). Com os dois, a transação remove `lyra-nvidia`, `nvidia-open` e o
KMP CUDA, instala o G07 595.99.02 com o KMP assinado do OSS e o arquivo
`lyra-nvidia-upstream.repo` sai junto com o pacote; `zypper verify` passa. O
estado final é idêntico ao de uma instalação pelo guia, conferida no notebook
de referência (GTX 1650, Secure Boot ligado, módulo carregado).

A recuperação offline (`vegad nvidia-recover`) deixou de existir: pontos já
criados continuam no disco (ver `lyraos-server/docs/nvidia-recovery.md`).

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
- `site`: dispensado; o guia mora nas Discussions #234 e #366. Notas antigas ficam.

## Reversão

Cada repositório volta pela tag anterior no OBS (staging = release). A
exclusão do `lyra-nvidia` não tem reversão pelo OBS: os projetos foram
apagados. Numa máquina, a migração manual se desfaz pelo ponto de restauração
criado antes dela (Desktop) ou pelo backup (Server).
