# Análise do boot

## Requirements

### Requirement: Medir o último boot
O teste `boot` DEVE ler o último boot com `systemd-analyze` e reportar o tempo
de cada fase (firmware, carregador, kernel, initrd, sistema), o tempo até
`graphical.target` e os cinco serviços que mais demoraram entre os que começaram antes do login gráfico. Serviços de timer que rodam depois do login NÃO DEVEM ser apontados como causa de atraso do boot.

#### Scenario: boot normal
- **WHEN** o sistema levou 9 s até `graphical.target`
- **THEN** o veredito é `ok`, e as métricas trazem cada fase e os serviços mais lentos

### Requirement: Encontrar o que atrasa
O teste DEVE produzir:
- `boot.slow` (atenção) quando a fase do sistema passar de 60 s;
- `boot.wait-online` quando o `NetworkManager-wait-online.service` estiver na
  cadeia crítica por mais de 5 s;
- `boot.missing-device` quando um job `.device` do `fstab` esgotar o tempo;
- `boot.slow-service` para cada serviço acima de 10 s.

#### Scenario: esperando a rede
- **WHEN** o `NetworkManager-wait-online.service` levou 30 s na cadeia crítica
- **THEN** o relatório traz `boot.wait-online` com o remédio `disable-wait-online`

#### Scenario: disco que não existe mais
- **WHEN** `dev-disk-by\x2duuid-…device` esgotou o tempo no boot
- **THEN** o relatório traz `boot.missing-device` com a orientação de revisar o `fstab` e o atalho para Armazenamento

### Requirement: Desativar só o que é seguro
O remédio `disable-service` DEVE desabilitar apenas unidades que o pacote da
imagem Lyra não habilita por padrão (conferido pelo preset do systemd).
`disable-wait-online` NÃO DEVE ser oferecido quando um serviço habilitado
declara `After=network-online.target` e `Wants=network-online.target`. Os dois
DEVEM ser desfeitos com `systemctl enable`, e o Vega DEVE mostrar como.

#### Scenario: serviço da imagem
- **WHEN** um serviço habilitado pelo preset da Lyra demora 12 s
- **THEN** o achado é só orientação, sem remédio

#### Scenario: algo depende da rede no boot
- **WHEN** um serviço habilitado precisa do `network-online.target`
- **THEN** `disable-wait-online` não é oferecido
