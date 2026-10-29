# Verificação periódica

## ADDED Requirements

### Requirement: Job leve em segundo plano
ENQUANTO a verificação periódica estiver ligada, o vegad DEVE rodar, na
frequência configurada, só os testes somente leitura e sem carga
(`disk-health`, `logs`, `platform`, `security`), com prioridade baixa (`nice`,
`ionice -c3`). NÃO DEVE rodar enquanto houver uma transação, um diagnóstico em
andamento ou a máquina na bateria abaixo de 30%.

#### Scenario: notebook na bateria fraca
- **WHEN** chega a hora e a bateria está em 20% sem carregador
- **THEN** o job é adiado para a próxima oportunidade, sem aviso ao usuário

### Requirement: Avisar só o que mudou
O vegad DEVE comparar o resultado com o da execução periódica anterior e
considerar **novidade** só:
- um código de atenção ou falha que não existia antes;
- o SMART `percentUsed` subindo mais de 5 pontos em 30 dias;
- `security.patches-pending` presente há mais de 7 dias.

Achados que já existiam e continuam iguais NÃO DEVEM gerar aviso de novo.

#### Scenario: semana sem mudanças
- **WHEN** o resultado é igual ao da semana anterior, inclusive com os mesmos achados de atenção
- **THEN** nenhuma notificação é mostrada

#### Scenario: porta exposta nova
- **WHEN** aparece `security.exposed-port` para 8000/tcp, que não existia antes
- **THEN** o usuário recebe uma notificação com uma novidade

### Requirement: Notificação que leva ao conserto
QUANDO há novidades, o Vega DEVE mostrar uma notificação do GNOME com a
quantidade e um resumo curto. Clicar DEVE abrir o relatório na seção
Diagnóstico, já com o Resolver disponível.

#### Scenario: abrir pela notificação
- **WHEN** o usuário clica na notificação
- **THEN** o Vega abre Hardware e Kernel → Diagnóstico com o relatório periódico

### Requirement: Sob controle do usuário
O usuário DEVE poder ligar e desligar a verificação e escolher a frequência
em Preferências. A configuração DEVE valer para o sistema, e mudá-la DEVE pedir
autorização administrativa.

#### Scenario: desligar
- **WHEN** o usuário desliga a verificação periódica
- **THEN** o timer do vegad é desabilitado e nenhuma notificação aparece mais
