# Ações por item no diagnóstico

## ADDED Requirements

### Requirement: Corrigir na lista de testes
QUANDO o último resultado de um teste é Atenção ou Erro e algum achado dele
tem remédio, o Vega DEVE mostrar **Corrigir** ao lado do selo, sem pedir a
senha dos logs para isso. Sem remédio, DEVE mostrar **Ver o que fazer**.

#### Scenario: NTP desligado
- **WHEN** o teste `platform` termina em Atenção com `platform.ntp-off`
- **THEN** a linha Plataforma mostra Atenção e Corrigir, e Corrigir liga a sincronização e roda o `platform` de novo

#### Scenario: Secure Boot desligado
- **WHEN** o único achado de atenção do teste não tem remédio
- **THEN** a linha mostra Ver o que fazer, que abre o relatório

### Requirement: Corrigir item a item
O vegad DEVE oferecer `Diagnostics.RepairFindings(jobId, findings)`, que
conserta só os achados indicados, com os argumentos que cada um tem no
relatório gravado. Índice inexistente ou achado sem remédio DEVE dar
`NotSupported`.

#### Scenario: duas portas expostas
- **WHEN** o relatório tem `security.exposed-port` para 8000/tcp e 9000/tcp e o usuário corrige só o de 8000/tcp
- **THEN** só 8000/tcp sai da zona, e o reteste ainda aponta 9000/tcp

#### Scenario: índice adulterado
- **WHEN** o frontend pede o achado 99 de um teste com três achados
- **THEN** o vegad responde `NotSupported` e nada muda

### Requirement: Lista de remédios sem senha
`Diagnostics.Remedies(jobId)` DEVE devolver `(stage, findingIndex, remedy)`
de cada achado com remédio, sem textos nem argumentos, e NÃO DEVE pedir
senha.

#### Scenario: abrir a página
- **WHEN** o usuário abre Diagnóstico depois de um job com dois remédios
- **THEN** a lista mostra Corrigir nos dois testes, sem diálogo de senha

### Requirement: Já vi nos logs
O Vega DEVE oferecer **Já vi** nos achados do teste `logs` e no item Logs.
O vegad DEVE gravar o "visto desde" e, nas execuções seguintes, o teste
`logs` NÃO DEVE contar erros, core dumps nem serviços com falha anteriores a
ele.

#### Scenario: core dumps antigos
- **WHEN** o teste `logs` aponta 30 core dumps de dias atrás e o usuário toca Já vi
- **THEN** o `logs` roda de novo e fica Saudável

#### Scenario: falha nova depois do Já vi
- **WHEN** um serviço falha depois do Já vi
- **THEN** a próxima execução do `logs` aponta esse serviço de novo

### Requirement: Compatibilidade
SE o vegad não anuncia `diagnostics-actions-v1`, ENTÃO o Vega DEVE manter o
comportamento atual (Resolver por remédio dentro do relatório) e NÃO DEVE
mostrar Corrigir na lista nem Já vi.

#### Scenario: vegad antigo
- **WHEN** o vegad anuncia só até `diagnostics-v3`
- **THEN** a lista mostra só o selo e Executar, como hoje
