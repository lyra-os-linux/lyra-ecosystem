# Backup e firmware no diagnóstico

## Requirements

### Requirement: Backup atrasado
O teste `platform` DEVE produzir `backup.stale` (atenção) quando nenhuma
configuração de backup do Vega tem snapshot nos últimos 14 dias, com a data do
mais recente, e `backup.none` (informação) quando não existe nenhuma
configuração. Os dois DEVEM ter atalho para a página Backup.

#### Scenario: último backup há 30 dias
- **WHEN** a única configuração tem o snapshot mais novo de 30 dias atrás
- **THEN** o relatório traz `backup.stale` com "último backup há 30 dias" e o atalho para Backup

#### Scenario: destino desconectado
- **WHEN** o disco de backup não está conectado e não dá para listar os snapshots
- **THEN** o achado usa a última data conhecida, e diz que o destino está desconectado

### Requirement: Atualizar firmware pelo Vega
QUANDO o usuário clica em Atualizar no achado `platform.firmware-updates`, o
Vega DEVE rodar `fwupdmgr update` na sessão do usuário. Ele DEVE mostrar o
progresso no console da tarefa e, no fim, avisar se é preciso reiniciar. NÃO
DEVE pedir a ação administrativa do Vega: o polkit do fwupd decide.

#### Scenario: firmware assinado
- **WHEN** há uma atualização assinada do firmware do SSD
- **THEN** a atualização roda sem a senha do Vega, e o Vega avisa "Reinicie para concluir" quando o fwupd pedir
