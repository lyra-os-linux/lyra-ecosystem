# Diagnóstico de segurança

## ADDED Requirements

### Requirement: Teste de segurança
O diagnóstico DEVE oferecer o teste `security`, somente leitura, com duração
estimada abaixo de 30 s, sem exigir tomada e incluído nos modos Rápido e
Completo.

#### Scenario: modo Rápido
- **WHEN** o usuário executa o diagnóstico Rápido
- **THEN** o teste `security` roda e entra no relatório

### Requirement: Firewall
SE o firewalld está parado ou desabilitado, ENTÃO o teste DEVE produzir o
achado `security.firewall-off` (atenção) com o remédio `enable-firewall`.

#### Scenario: firewall parado
- **WHEN** `systemctl is-active firewalld` responde `inactive`
- **THEN** o relatório traz `security.firewall-off` com o remédio `enable-firewall`

### Requirement: Portas expostas
O teste DEVE produzir um achado `security.exposed-port` (atenção) para cada
socket `exposed` da capacidade `network-exposure`. O achado DEVE ter o remédio
`close-port`, com a zona e o serviço ou porta como argumentos. As exceções do
perfil (`ssh` e 9090/tcp no Server) contam como informação.

#### Scenario: servidor de desenvolvimento esquecido
- **WHEN** um processo escuta em `0.0.0.0:8000` e a zona `public` libera 8000/tcp
- **THEN** o relatório traz `security.exposed-port` com o remédio `close-port` e os argumentos `public` e `8000/tcp`

#### Scenario: SSH no Server
- **WHEN** o perfil é `server` e o 22/tcp está liberado pelo serviço `ssh`
- **THEN** o achado é informativo e não tem remédio

### Requirement: Patches de segurança
SE há patches da categoria `security` pendentes, ENTÃO o teste DEVE produzir
`security.patches-pending` (atenção) com a contagem, os nomes e o remédio
`apply-security-patches`.

#### Scenario: dois patches pendentes
- **WHEN** `zypper -n --no-refresh list-patches --category security` lista dois patches
- **THEN** o relatório traz `security.patches-pending` com contagem 2 e o remédio `apply-security-patches`

### Requirement: SSH
ONDE o `sshd` está habilitado ou ativo, o teste DEVE ler a configuração
efetiva (`sshd -T`) e produzir:
- `security.ssh-root-password` (atenção) quando o login de root por senha é
  permitido;
- `security.ssh-password` (atenção no perfil `desktop`, informação no
  `server`) quando a autenticação por senha está ligada.

Esses achados não têm remédio automático: orientação e atalho para Serviços.

#### Scenario: SSH desligado
- **WHEN** o `sshd` está desabilitado e parado
- **THEN** o teste não produz nenhum achado de SSH

### Requirement: SELinux, Secure Boot e criptografia
O teste DEVE reportar:
- o modo do SELinux (`enforcing`, `permissive` ou `disabled`) como métrica e,
  até o ADR da edição, como informação;
- o Secure Boot desligado como informação;
- a raiz fora de um dispositivo `crypt` (LUKS) como `security.disk-unencrypted`,
  informativo no desktop e com orientação. Criptografar depois da instalação
  não tem conserto automático.

#### Scenario: notebook sem LUKS
- **WHEN** a raiz está num dispositivo sem nenhum ancestral `crypt` no `lsblk`
- **THEN** o relatório traz `security.disk-unencrypted` como informação, sem remédio

### Requirement: Contas e sudo
O teste DEVE produzir:
- `security.empty-password` (falha) para toda conta com UID ≥ 1000 e senha
  vazia no `/etc/shadow`;
- `security.sudo-open` (falha) quando um usuário fora do `wheel` consegue
  `sudo`.

Isso reaproveita a política `sudo-policy-wheel-auth-self`. O relatório NÃO
DEVE conter hashes de senha.

#### Scenario: conta sem senha
- **WHEN** a conta `teste` (UID 1002) tem o campo de senha vazio
- **THEN** o relatório traz `security.empty-password` com o nome da conta e sem nenhum hash

### Requirement: Remédios de segurança
O `Repair` DEVE aceitar os remédios a seguir, com os argumentos lidos só do
relatório gravado e validados por padrões estritos, como os da fase 4:
- `enable-firewall`: `systemctl enable --now firewalld`;
- `close-port`: tirar o serviço ou a porta da zona, permanentemente e em tempo
  de execução;
- `apply-security-patches`:
  `zypper -n patch --category security --with-interactive=no`, dentro do par
  de snapshots.

QUANDO o reparo termina, o teste `security` DEVE rodar de novo.

#### Scenario: fechar uma porta e conferir
- **WHEN** o usuário aplica `close-port` para `public` e `8000/tcp`
- **THEN** a zona `public` deixa de liberar 8000/tcp e o reteste não traz mais `security.exposed-port` para ela

#### Scenario: argumento adulterado
- **WHEN** o relatório gravado tem `close-port` com a zona `--panic-on`
- **THEN** o remédio recusa o argumento e não chama o `firewall-cmd`

### Requirement: Orientação no Vega
Todo achado de segurança sem remédio DEVE ter uma orientação curta e, quando
houver página correspondente, um atalho (Serviços, Firewall, Usuários). O
achado `security.disk-unencrypted` DEVE explicar que a criptografia se escolhe
na instalação.

#### Scenario: senha de root no SSH
- **WHEN** o relatório traz `security.ssh-root-password`
- **THEN** o Vega mostra a orientação e o atalho para Serviços
