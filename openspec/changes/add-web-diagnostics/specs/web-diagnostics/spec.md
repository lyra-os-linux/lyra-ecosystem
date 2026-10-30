# Diagnóstico no `vega-web`

## ADDED Requirements

### Requirement: Diagnóstico de saúde no painel web
O `vega-web` DEVE listar os testes com o último resultado sem pedir senha,
executar o modo Rápido ou um teste só mostrando a etapa e o percentual,
mostrar o relatório e permitir corrigir achados escolhidos, marcar os logs
como vistos e mudar a verificação periódica. Toda ação que não é pública DEVE
passar pelo broker administrativo com a senha do usuário de `wheel`.

#### Scenario: modo Rápido
- **WHEN** o administrador escolhe o modo Rápido e confirma com a senha
- **THEN** a página mostra a etapa e o percentual até o fim e oferece o relatório

#### Scenario: corrigir só um achado
- **WHEN** o relatório tem dois achados com conserto e o administrador marca só um
- **THEN** o painel chama `RepairFindings` só com esse achado e acompanha até o reteste

#### Scenario: conta sem wheel
- **WHEN** um usuário fora de `wheel` tenta iniciar o diagnóstico
- **THEN** o broker recusa e nenhum job é criado

### Requirement: Relatório com boot e rede
O relatório DEVE mostrar, por teste, o resultado e os achados de atenção e
falha com a orientação; no teste `boot`, o tempo por fase; no teste
`network`, os passos (funcionando, problema, não testado).

#### Scenario: boot lento
- **WHEN** o relatório tem o achado de boot lento
- **THEN** a página mostra o tempo do firmware, do carregador, do kernel e do espaço do usuário, e as unidades mais lentas

### Requirement: Última verificação semanal
O `vega-web` DEVE mostrar o estado da verificação periódica no painel inicial
sem senha e, com a senha, a data, a quantidade e os textos das novidades da
última execução, com o caminho para o relatório dela.

#### Scenario: porta nova exposta
- **WHEN** a verificação de domingo achou `security.exposed-port` e o administrador abre a última verificação
- **THEN** o painel mostra "1 novidade" com o texto do achado

### Requirement: Minha internet não funciona
Em Rede e Firewall, o `vega-web` DEVE rodar o teste `network` e mostrar os
passos e o conserto quando houver, pedindo a senha uma única vez.

#### Scenario: DNS quebrado
- **WHEN** o teste aponta `network.dns-failed`
- **THEN** a página mostra os passos até o DNS e oferece "Usar DNS público nesta conexão"

### Requirement: Liberar espaço no painel web
Em Armazenamento, o `vega-web` DEVE medir as categorias do sistema do
`Cleanup`, deixar escolher quais limpar (as seguras marcadas, `old-kernels`
e `snapshots` desmarcados), confirmar listando o que sai e mostrar o total
liberado. NÃO DEVE oferecer categorias da pasta pessoal.

#### Scenario: journal e cache
- **WHEN** o administrador escolhe `journal` e `package-cache` e confirma com a senha
- **THEN** o painel chama `Clean` com os dois e mostra o total liberado

### Requirement: Pedir ajuda pelo painel
A partir do relatório, o `vega-web` DEVE montar o texto de ajuda a partir do
relatório **redigido**, com a descrição do usuário, no limite de 6000
caracteres, e DEVE oferecer os links para as Discussions e para uma issue
nova. NÃO DEVE incluir dados do relatório sem redação.

#### Scenario: relatório longo
- **WHEN** os dados brutos passam do limite
- **THEN** o texto encurta os dados brutos por igual e mantém todos os achados

### Requirement: Entradas fixas no broker
As operações novas do broker DEVEM aceitar só campos fixos: ids de teste e de
categoria conhecidos, número do job, pares de achado vindos de `Remedies` e a
frequência `weekly` ou `daily`. SE o pedido trouxer qualquer outro valor,
ENTÃO o broker DEVE recusá-lo antes de pedir a senha.

#### Scenario: teste inventado
- **WHEN** o formulário envia o teste `../../etc`
- **THEN** o painel recusa com erro de validação e o broker não é aberto
