# Tarefas

## 1. Decisões
- [x] 1.1 Mantenedor valida esta proposta (aprovado em 29/10/2026)
- [x] 1.2 Limite do journal: 500 MB, decidido em 29/10/2026

## 2. Contrato (`lyra-vega-dbus`)
- [x] 2.1 `org.lyraos.Vega1.Cleanup` (`Scan`, `Clean`, sinais) + capability `space-cleanup-v1`
- [x] 2.2 Cliente tipado, documentação e o código `storage.low-space`; PR em draft até o vegad

## 3. vegad
- [x] 3.1 `internal/cleanup`: medição por categoria, com testes sobre capturas reais (`du`, `journalctl --disk-usage`, `snapper`, `flatpak`)
- [x] 3.2 Limpeza por categoria; `old-kernels` dentro do snapshot; nunca o kernel em uso nem o mais novo
- [x] 3.3 `Clean` no coordenador de exclusividade; job com progresso e bytes liberados
- [x] 3.4 Polkit `storage.cleanup` e leitura silenciosa do `Scan`
- [x] 3.5 `storage.low-space` no teste `platform`
- [x] 3.6 Execução real na workstation (Scan sem senha; limpeza pelo Vega aprovada pelo mantenedor)

## 4. Vega
- [x] 4.1 Seção Liberar espaço em Armazenamento, com categorias do sistema e do usuário
- [x] 4.2 Limpeza do usuário na sessão, sem seguir links simbólicos (teste com link para `~/Documentos`)
- [x] 4.3 Atalho a partir do diagnóstico; textos em pt, en e es
- [x] 4.4 Teste do mantenedor

## 5. Release
- [x] 5.1 vegad 5.5.0 (SR 1393759) e vega-gtk 5.7.0 (SR 1393760): release validado e instalado em 30/10/2026
- [x] 5.2 Arquivar a mudança e mover os requisitos para `openspec/specs/`
