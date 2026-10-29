# Tarefas

## 1. Decisões
- [x] 1.1 Mantenedor valida esta proposta (29/10/2026)
- [ ] 1.2 `lyraos-desktop`: ADR da política de SELinux da edição (questão aberta 1)

## 2. Contrato (`lyra-vega-dbus`)
- [ ] 2.1 `Firewall.ListListening` + capability `network-exposure-v1`
- [ ] 2.2 Teste `security`, remédios `enable-firewall`, `close-port`, `apply-security-patches`, capability `diagnostics-v3`
- [ ] 2.3 Cliente tipado e `docs/diagnostics.md`; PR em draft até o vegad (ciclo da CI `daemon-contract`)

## 3. vegad
- [ ] 3.1 `listening.go`: parse do `ss`, alcance, unidade pelo cgroup, cruzamento com o firewalld (testes com capturas reais)
- [ ] 3.2 `ListListening` como leitura intermediada silenciosa (teste de roteamento das leituras)
- [ ] 3.3 Teste `security` com cada verificação e fixtures reais; nenhum hash no relatório
- [ ] 3.4 Remédios com validação estrita e testes de argumento adulterado
- [ ] 3.5 Perfis `desktop`/`server` (SSH e 9090)
- [ ] 3.6 Integração contra o contrato; execução real como root na workstation

## 4. Vega
- [ ] 4.1 Seção Portas abertas, com as ações e a recusa de fechar a porta da própria sessão remota
- [ ] 4.2 Teste "Segurança" no diagnóstico, orientações e atalhos; textos em pt, en e es
- [ ] 4.3 Teste do mantenedor na workstation

## 5. Release
- [ ] 5.1 vegad, vega-gtk: staging, check, SR, release, instalação
- [ ] 5.2 Arquivar esta mudança e mover os requisitos para `openspec/specs/`
