# Tarefas

## 1. Decisões
- [x] 1.1 Mantenedor valida esta proposta (aprovado em 29/10/2026)
- [x] 1.2 Limite do journal: 500 MB, decidido em 29/10/2026

## 2. Contrato (`lyra-vega-dbus`)
- [ ] 2.1 `org.lyraos.Vega1.Cleanup` (`Scan`, `Clean`, sinais) + capability `space-cleanup-v1`
- [ ] 2.2 Cliente tipado, documentação e o código `storage.low-space`; PR em draft até o vegad

## 3. vegad
- [ ] 3.1 `internal/cleanup`: medição por categoria, com testes sobre capturas reais (`du`, `journalctl --disk-usage`, `snapper`, `flatpak`)
- [ ] 3.2 Limpeza por categoria; `old-kernels` dentro do snapshot; nunca o kernel em uso nem o mais novo
- [ ] 3.3 `Clean` no coordenador de exclusividade; job com progresso e bytes liberados
- [ ] 3.4 Polkit `storage.cleanup` e leitura silenciosa do `Scan`
- [ ] 3.5 `storage.low-space` no teste `platform`
- [ ] 3.6 Execução real na workstation (core dumps, journal, cache)

## 4. Vega
- [ ] 4.1 Seção Liberar espaço em Armazenamento, com categorias do sistema e do usuário
- [ ] 4.2 Limpeza do usuário na sessão, sem seguir links simbólicos (teste com link para `~/Documentos`)
- [ ] 4.3 Atalho a partir do diagnóstico; textos em pt, en e es
- [ ] 4.4 Teste do mantenedor

## 5. Release
- [ ] 5.1 vegad e vega-gtk: staging, check, SR, release e instalação
- [ ] 5.2 Arquivar a mudança e mover os requisitos para `openspec/specs/`
