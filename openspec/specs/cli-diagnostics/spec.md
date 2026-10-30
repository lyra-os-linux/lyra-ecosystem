# Diagnóstico no `vega-cli`

## Requirements

### Requirement: Resumo da verificação semanal ao abrir
QUANDO o administrador abre o `vega` e a última verificação periódica teve
novidades que ele ainda não viu, o `vega-cli` DEVE mostrar a data, a
quantidade e os textos das novidades antes do menu principal, e DEVE oferecer
abrir o relatório. Sem novidades novas, NÃO DEVE mostrar nada.

#### Scenario: porta nova exposta durante a semana
- **WHEN** a verificação de domingo achou `security.exposed-port` novo e o administrador entra por SSH na segunda
- **THEN** o `vega` mostra "1 novidade" com o texto do achado antes do menu

#### Scenario: segunda entrada no mesmo dia
- **WHEN** o administrador já viu o resumo desse job e abre o `vega` de novo
- **THEN** o menu abre direto

### Requirement: Diagnóstico de saúde pelo terminal
O `vega-cli` DEVE listar os testes com o último resultado, executar o modo
Rápido ou um teste só com progresso, mostrar o relatório e permitir corrigir
achados escolhidos, marcar os logs como vistos e mudar a verificação
periódica.

#### Scenario: corrigir só um achado
- **WHEN** o relatório tem dois achados com conserto e o administrador marca só um no checklist
- **THEN** o `vega-cli` chama `RepairFindings` só com esse achado e mostra o progresso até o reteste

### Requirement: Minha internet não funciona
Em Rede e Firewall, o `vega-cli` DEVE rodar o teste `network` e mostrar os
passos (funcionando, problema, não testado) e o conserto quando houver.

#### Scenario: DNS quebrado
- **WHEN** o teste aponta `network.dns-failed`
- **THEN** a tela mostra os passos até o DNS e oferece "Usar DNS público nesta conexão"

### Requirement: Liberar espaço pelo terminal
Em Armazenamento, o `vega-cli` DEVE mostrar as categorias do sistema do
`Cleanup` com o tamanho, deixar escolher quais limpar (as seguras marcadas,
`old-kernels` e `snapshots` desmarcados), confirmar listando o que sai e
mostrar o total liberado.

#### Scenario: journal e cache num servidor
- **WHEN** o administrador escolhe `journal` e `package-cache` e confirma
- **THEN** o `vega-cli` chama `Clean` com os dois e mostra o total liberado

### Requirement: Leituras sem senha também pelo SSH
Para membros de `wheel` em sessão remota, o polkit do vegad DEVE liberar em
silêncio `hardware.read-admin`, `storage.read-admin` e `network.diagnose`,
como já faz com as outras leituras intermediadas. As mutações continuam
pedindo a senha.

#### Scenario: resumo pelo SSH
- **WHEN** um membro de `wheel` abre o `vega` por SSH
- **THEN** o resumo da verificação semanal aparece sem pedir senha
