# Design: revisão de segurança no Vega

## Contrato (`lyra-vega-dbus`)

- `org.lyraos.Vega1.Firewall.ListListening() -> a(ssqsssss)`: protocolo,
  endereço, porta, executável, unidade, alcance (`local`/`link`/`network`),
  estado (`exposed`/`filtered`/`n/a`) e zona. É uma leitura intermediada
  silenciosa sob `org.lyraos.vega.firewall.read-admin`, como `ListServices`.
  Capability `network-exposure-v1`.
- `Diagnostics`: o id de teste `security` e os remédios `enable-firewall`,
  `close-port` e `apply-security-patches`. Capability `diagnostics-v3`. O
  schema do relatório continua em 1.

## vegad

- `internal/network/listening.go`: lê `ss -H -tulpn` em locale C, faz o
  parse, classifica o alcance e resolve a unidade pelo cgroup do PID
  (`/proc/<pid>/cgroup`). O cruzamento com o firewalld usa a mesma origem do
  `Firewall.ListServices` (zonas, serviços, portas e `target`). As portas de
  cada serviço vêm de `firewall-cmd --info-service`.
- `internal/diagnostics/security.go`: o teste `security`. Os dados vêm de:
  - `listening.go`, para as portas;
  - `zypper list-patches --category security`, para os patches;
  - `sshd -T`, só com o sshd habilitado ou ativo;
  - `getenforce` ou `/sys/fs/selinux/enforce`, para o SELinux;
  - `mokutil`, para o Secure Boot;
  - `lsblk -J -o NAME,TYPE,MOUNTPOINT` e a cadeia de pais da raiz, para a
    criptografia;
  - `/etc/shadow`, lido pelo root, para as contas. O teste devolve só os
    nomes, nunca hashes, e as contas entram na lista de redação;
  - `sudo -l -U <usuário>` para cada usuário fora do `wheel`, para o sudo.
- Os remédios ficam em `remedy.go`:
  - `close-port`: argumentos zona + `service:<nome>` ou `port:<n>/<proto>`,
    validados contra a lista de zonas e o padrão de serviço/porta. Roda
    `firewall-cmd --permanent` e depois `--reload`.
  - `apply-security-patches`: roda dentro do `withSnapshots` do reparo.
    Reiniciar, quando o patch pede, vira orientação e não ação.
- Perfil: no `server`, `ssh` e 9090/tcp são esperados.

## Vega

- Firewall: nova seção **Portas abertas** com o programa, a porta e um selo
  de alcance (Só esta máquina, Rede local virtual, **Exposta na rede**). Um
  socket exposto ganha o menu "Fechar no firewall" ou "Parar o serviço".
- Diagnóstico: o teste "Segurança", o mapa de orientação e os atalhos dos
  códigos novos.

## Alternativas descartadas

- **Varrer portas por fora (nmap):** é lento, depende da rede e só vê o
  efeito, não o processo. O `ss` com o firewalld responde o que o usuário
  precisa: quem abriu e se está exposto.
- **Antivírus residente:** custo alto e ganho baixo no Linux. Fica para a
  proposta do ClamAV sob demanda.

## Riscos

- `close-port` pode derrubar um acesso legítimo. Por isso o Vega confirma
  sempre, e a regra de acesso remoto recusa fechar a porta da própria sessão.
- `sshd -T` precisa de root e das chaves do host. Se falhar, o achado vira
  "não foi possível ler", e não um falso negativo.
