# Pedir ajuda

## ADDED Requirements

### Requirement: Texto revisável e sempre com redação
QUANDO o usuário clica em "Pedir ajuda", o Vega DEVE montar o texto a partir
do relatório **redigido** (sem serial, MAC, SSID, hostname nem nomes de conta)
e mostrá-lo editável antes de qualquer ação. O texto NÃO DEVE sair da máquina
sem um clique do usuário em Copiar ou Abrir.

#### Scenario: revisar antes de compartilhar
- **WHEN** o usuário abre "Pedir ajuda"
- **THEN** o painel mostra o texto completo, editável, e nenhum dado foi enviado

#### Scenario: dado pessoal
- **WHEN** o relatório tem o número de série do SSD e o nome do computador
- **THEN** o texto mostra `[redacted]` no lugar dos dois

### Requirement: Conteúdo útil para quem ajuda
O texto DEVE conter:
- a descrição do usuário;
- o produto e as versões do sistema, do kernel, do vegad e do Vega;
- o resultado de cada teste em uma linha;
- os achados de atenção e falha com os dados brutos encurtados.

O texto DEVE caber em 6.000 caracteres, cortando primeiro os dados brutos.

#### Scenario: relatório grande
- **WHEN** os dados brutos dos achados somam 40.000 caracteres
- **THEN** o texto fica abaixo de 6.000, termina cada trecho cortado com "…" e mantém todos os achados

### Requirement: Destinos
O Vega DEVE oferecer Copiar, Abrir no fórum e Abrir uma issue. Os dois últimos
DEVEM abrir o navegador padrão com o título e o corpo preenchidos pela URL, e
o Copiar DEVE pôr o texto na área de transferência.

#### Scenario: abrir uma issue
- **WHEN** o usuário escolhe "Abrir uma issue no GitHub"
- **THEN** o navegador abre a página de nova issue do `lyraos-desktop` com o título e o corpo preenchidos
