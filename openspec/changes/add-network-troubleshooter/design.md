# Design: diagnóstico de rede

- **vegad,** `internal/diagnostics/network_check.go`:
  - enlace e sinal: `nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device` e
    `nmcli -t -f ACTIVE,SIGNAL device wifi`;
  - IP e gateway: `ip -j addr` e `ip -j route show default`;
  - gateway: `ping -c 2 -W 2 <gateway>`, que só funciona porque a imagem
    agora traz o iputils (#218);
  - DNS: resolver um nome conhecido usando os servidores de
    `/etc/resolv.conf`;
  - internet e portal: `nmcli networking connectivity check`, que usa o
    endereço do NetworkManager e devolve `full`, `portal`, `limited` ou
    `none`.
- Os remédios usam `nmcli`. O `temporary-dns` usa `nmcli device modify`, que
  muda só a conexão ativa, sem gravar no perfil.
- **Vega:**
  - botão "Minha internet não funciona" no topo da página Rede, que abre o
    resultado num painel passo a passo (ícone por etapa: ok, falhou, não
    testado);
  - o mesmo teste aparece no diagnóstico.
- **Descartado:** um "reset de rede" completo, que apaga perfis. É destrutivo
  e raramente necessário.
