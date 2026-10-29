# Exposição de rede

## ADDED Requirements

### Requirement: Listar o que escuta na rede
O vegad DEVE listar todo socket TCP em estado LISTEN e todo socket UDP ligado
da máquina, com protocolo, endereço, porta, executável e unidade systemd do
processo dono.

#### Scenario: CUPS só na própria máquina
- **WHEN** o CUPS escuta em `127.0.0.1:631` e `[::1]:631`
- **THEN** a lista traz a porta 631/tcp do executável `cupsd`, da unidade `cups.service`, com alcance `local`

#### Scenario: processo sem unidade
- **WHEN** um processo iniciado no terminal escuta em `0.0.0.0:8000`
- **THEN** a lista traz o executável e a unidade vazia

### Requirement: Classificar o alcance
O vegad DEVE classificar cada socket como `local` (loopback), `link`
(link-local IPv6 ou endereço de uma interface `docker*`/`virbr*`/`veth*`) ou
`network` (qualquer outro, incluindo `0.0.0.0` e `::`).

#### Scenario: escuta em todas as interfaces
- **WHEN** o sshd escuta em `0.0.0.0:22`
- **THEN** o alcance é `network`

#### Scenario: cliente DHCPv6
- **WHEN** um socket UDP está em `[fe80::…]%wlp0s20f3:546`
- **THEN** o alcance é `link`

### Requirement: Cruzar com o firewall
ENQUANTO o firewalld estiver ativo, o vegad DEVE marcar cada socket `network`
como `exposed` quando a zona da interface por onde ele é alcançável libera a
porta (por serviço, porta ou `target=ACCEPT`), e como `filtered` caso
contrário.

#### Scenario: SSH liberado na zona public
- **WHEN** o sshd escuta em `0.0.0.0:22` e a zona `public` tem o serviço `ssh`
- **THEN** o socket é `exposed`

#### Scenario: porta aberta mas bloqueada
- **WHEN** um processo escuta em `0.0.0.0:8000` e nenhuma zona libera 8000/tcp
- **THEN** o socket é `filtered`

#### Scenario: firewall desligado
- **WHEN** o firewalld está parado
- **THEN** todo socket `network` é `exposed`

### Requirement: Leitura sem senha
O método de leitura DEVE ser uma leitura intermediada pelo coordenador, sem
diálogo de autenticação na sessão local ativa, como as demais leituras
`*.read-admin`. Abrir o Vega NÃO DEVE pedir senha.

#### Scenario: abrir a página Firewall
- **WHEN** o usuário da sessão local ativa abre Firewall
- **THEN** a lista aparece sem diálogo de senha

### Requirement: Agir sobre uma exposição
QUANDO o usuário pede para fechar um socket `exposed`, o Vega DEVE oferecer
duas ações:
- **fechar no firewall:** remove o serviço ou a porta da zona, pelas operações
  existentes `Firewall.SetServiceEnabled` e `Firewall.RemovePort`;
- **parar o serviço:** pelo `Services.SetServiceRunning`, só quando há uma
  unidade.

Cada ação DEVE confirmar o que será feito.

#### Scenario: fechar o SSH esquecido
- **WHEN** o usuário escolhe fechar no firewall o 22/tcp liberado pelo serviço `ssh` da zona `public`
- **THEN** o Vega desliga o serviço `ssh` na zona e a lista mostra o socket como `filtered`

### Requirement: Nunca derrubar o acesso remoto em uso
SE a sessão do Vega é remota (vega-web ou SSH) e a ação fecharia a porta por
onde ela chegou, ENTÃO o Vega DEVE recusar com uma explicação.

#### Scenario: vega-web pela porta 9090
- **WHEN** o usuário do vega-web tenta fechar 9090/tcp
- **THEN** a ação é recusada e a porta continua aberta
