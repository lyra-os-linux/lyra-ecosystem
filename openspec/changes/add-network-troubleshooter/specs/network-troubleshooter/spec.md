# Diagnóstico de rede

## ADDED Requirements

### Requirement: Testar a conexão em ordem
O teste `network` DEVE verificar, nesta ordem: enlace, endereço IP, gateway,
DNS, acesso à internet e portal cativo. O primeiro passo que falhar DEVE virar
o achado principal, e os passos seguintes DEVEM aparecer como "não testado".

#### Scenario: Wi-Fi desconectado
- **WHEN** nenhuma interface está conectada e o Wi-Fi está ligado
- **THEN** o achado principal é `network.no-link`, e IP, gateway, DNS e internet aparecem como "não testado"

#### Scenario: DNS quebrado
- **WHEN** há IP e o gateway responde, mas a resolução de nomes falha
- **THEN** o achado principal é `network.dns-failed`, com o remédio `temporary-dns`

#### Scenario: tudo certo
- **WHEN** todos os passos passam
- **THEN** o veredito é `ok`, com o resumo da interface, do IP, do gateway e do DNS em uso

### Requirement: Explicar cada falha
Cada falha DEVE ter texto em linguagem de usuário, orientação e, quando
houver, um remédio ou atalho:

| Achado | Remédio ou orientação |
| --- | --- |
| `network.no-link` (cabo ou Wi-Fi) | `reconnect`; atalho para Rede |
| `network.wifi-weak` (sinal < 30%) | orientação: aproxime-se do roteador |
| `network.no-address` | `renew-dhcp` |
| `network.gateway-unreachable` | orientação: reinicie o roteador |
| `network.dns-failed` | `temporary-dns` |
| `network.no-internet` (DNS ok, HTTP falha) | orientação: provedor ou roteador |
| `network.captive-portal` | botão "Abrir página de login" no navegador |

#### Scenario: portal cativo
- **WHEN** a checagem HTTP é redirecionada para uma página de login
- **THEN** o achado é `network.captive-portal`, e o Vega oferece abrir a página no navegador

### Requirement: Remédios reversíveis
Os remédios DEVEM agir só na conexão ativa e DEVEM ser reversíveis:
- `reconnect`: `nmcli connection up` da conexão atual;
- `renew-dhcp`: reaplicar a conexão;
- `temporary-dns`: usar DNS público (1.1.1.1 e 9.9.9.9) **só nesta ativação**
  da conexão. O perfil salvo não muda, e a próxima conexão volta ao normal.

O teste `network` DEVE rodar de novo depois do reparo.

#### Scenario: DNS temporário
- **WHEN** o usuário aplica `temporary-dns`
- **THEN** a resolução passa a funcionar, o perfil salvo da conexão continua igual e o reteste dá `ok`

### Requirement: Sem senha para testar
Rodar o teste `network` NÃO DEVE pedir senha na sessão local ativa. Os
remédios PODEM pedir senha, pelo polkit do NetworkManager.

#### Scenario: botão na página Rede
- **WHEN** o usuário clica em "Minha internet não funciona"
- **THEN** o teste roda sem diálogo de senha e mostra o resultado passo a passo
