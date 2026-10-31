# Tarefas

## 1. Decisões
- [x] 1.1 Mantenedor valida esta proposta (aprovada em 31/10/2026)
- [x] 1.2 Migração: `lyra-nvidia` de transição (31/10/2026)
- [x] 1.3 Guia NVIDIA de destino: repositório gráfico da NVIDIA + metapacotes do Leap 16.1 (31/10/2026)
- [ ] 1.4 Versão de transição do `lyra-nvidia`: migrar para o caminho padrão ou congelar (ver design)

## 2. lyra-vega-dbus
- [ ] 2.1 XML: métodos NVIDIA `Deprecated`, comentário de `NotSupported`
- [ ] 2.2 Crate: remover métodos e tipos NVIDIA; README; nova tag

## 3. vegad
- [ ] 3.1 Respostas `NotSupported` e capacidades fora dos perfis
- [ ] 3.2 Remover instalação, diagnóstico, recuperação, `nvidia-recover` e reconciliação da suspensão
- [ ] 3.3 Unidade systemd sem a exceção de `ProtectKernelModules`
- [ ] 3.4 i18n, docs, specs e `check-packaging-contracts.sh`
- [ ] 3.5 Remover `packaging/lyra-nvidia/` (depois da 5.1)
- [ ] 3.6 Testes: `go test ./...` e integração D-Bus com `lyra-vega-dbus`

## 4. Frontends
- [ ] 4.1 vega-gtk: backend, página Hardware, diagnóstico, CSS, `.po`
- [ ] 4.2 vega-web: página, rotas, estado, IPC (código 3 reservado), helper, testes
- [ ] 4.3 vega-cli: `lib/nvidia.sh`, menu, `dbus.sh`, `transaction.py`, testes

## 5. lyra-nvidia
- [ ] 5.1 Versão de transição sem exigências de versão
- [ ] 5.2 Qualificação numa VM com a pilha instalada pelo Vega + kernel novo
- [ ] 5.3 Remover o pacote do OBS depois do período combinado

## 6. Edições, site e Discussions
- [ ] 6.1 lyraos-desktop: README e docs NVIDIA
- [ ] 6.2 lyraos-server: `nvidia-recovery.md` e comentário do `restic`
- [ ] 6.3 site: página de documentação NVIDIA (prévia local antes do merge)
- [ ] 6.4 Discussions #234, #366, #352 e citações ao Vega em #247, #279, #348, #351, #355, #429
- [ ] 6.5 `products.toml`/`contracts.toml`, se citarem NVIDIA

## 7. Release (um lote só)
- [ ] 7.1 Tags, staging, check, SR e aceite: lyra-vega-dbus, vegad, vega, vega-web, vega-cli, lyra-nvidia
