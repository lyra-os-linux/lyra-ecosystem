# Tarefas

## 1. Decisões
- [x] 1.1 Mantenedor valida esta proposta (aprovada em 31/10/2026)
- [x] 1.2 Migração: substituída pela decisão 1.4
- [x] 1.3 Guia NVIDIA de destino: repositório gráfico da NVIDIA + metapacotes do Leap 16.1 (31/10/2026)
- [x] 1.4 `lyra-nvidia`: excluir, com migração manual para o guia (31/10/2026; ver design)

## 2. lyra-vega-dbus
- [x] 2.1 XML: métodos NVIDIA `Deprecated`, comentário de `NotSupported`
- [x] 2.2 Crate: remover métodos e tipos NVIDIA; README; nova tag

## 3. vegad
- [x] 3.1 Respostas `NotSupported` e capacidades fora dos perfis
- [x] 3.2 Remover instalação, diagnóstico, recuperação, `nvidia-recover` e reconciliação da suspensão
- [x] 3.3 Unidade systemd sem a exceção de `ProtectKernelModules`
- [x] 3.4 i18n, docs, specs e `check-packaging-contracts.sh`
- [x] 3.5 Remover `packaging/lyra-nvidia/` (vegad#117)
- [x] 3.6 Testes: `go test ./...` e integração D-Bus com `lyra-vega-dbus`

## 4. Frontends
- [x] 4.1 vega-gtk: backend, página Hardware, diagnóstico, CSS, `.po`
- [x] 4.2 vega-web: página, rotas, estado, IPC (código 3 reservado), helper, testes
- [x] 4.3 vega-cli: `lib/nvidia.sh`, menu, `dbus.sh`, `transaction.py`, testes

## 5. lyra-nvidia
- [x] 5.1 Migração manual validada num chroot Leap 16.1 com a pilha instalada pelo Vega (31/10/2026)
- [x] 5.2 Passos da migração nas Discussions #234 e #366
- [x] 5.3 Apagar os projetos `home:rodrigosbrito:nvidia` e `nvidia:staging` do OBS (31/10/2026)

## 6. Edições, site e Discussions
- [x] 6.1 lyraos-desktop: README e docs NVIDIA
- [x] 6.2 lyraos-server: `nvidia-recovery.md` e comentário do `restic`
- [x] 6.3 site: dispensada; o guia mora nas Discussions #234 e #366
- [x] 6.4 Discussions #234, #366, #352 e citações ao Vega em #247, #279, #348, #351, #355, #429
- [x] 6.5 `products.toml`/`contracts.toml`: não citam NVIDIA

## 7. Release (um lote só)
- [x] 7.1 Tags, staging, check, SR e aceite: lyra-vega-dbus 5.2.0, vegad 5.7.0, vega-gtk 5.9.0, vega-web 5.3.0, vega-cli 5.3.0 (SRs 1394091–1394094, 31/10/2026)
