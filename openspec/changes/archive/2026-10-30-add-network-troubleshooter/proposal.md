# Proposta: "Minha internet não funciona"

## Por quê

"A internet parou" é o problema mais comum de quem chega ao Linux, e a resposta
está espalhada em comandos que o usuário não conhece: `nmcli`, `ip`, `ping`, o
DNS. O diagnóstico do Vega já sabe testar e explicar; falta aplicar isso à
rede, passo a passo, dizendo **onde** a conexão quebrou e o que fazer.

## O que muda

- Um teste novo, `network`, no diagnóstico, que pode rodar sozinho pelo botão
  **"Minha internet não funciona"** na página Rede. Ele verifica, em ordem:
  1. interface e enlace (cabo ou Wi-Fi conectado, sinal);
  2. endereço IP (DHCP);
  3. gateway;
  4. DNS;
  5. acesso à internet (HTTP para um endereço conhecido);
  6. portal cativo (login de hotel ou aeroporto).

  O primeiro passo que falhar vira o achado principal. Os seguintes são
  marcados como "não testado".
- Remédios seguros no Resolver: reconectar a interface, renovar o DHCP e usar
  um DNS público temporário na conexão atual (reversível).
- Orientação e atalho para o que não tem conserto automático, como cabo
  solto, senha do Wi-Fi errada ou o provedor fora do ar.

## Fora do escopo

- Velocidade e medição de banda.
- VPN e proxy, que entram só como informação: "você está numa VPN".
- Configuração avançada de rede, que continua na página Rede.

## Impacto

| Repositório | Mudança |
| --- | --- |
| `lyra-vega-dbus` | O teste `network` e os remédios `reconnect`, `renew-dhcp` e `temporary-dns` (capability `diagnostics-v4`) |
| `vegad` | O teste (`nmcli`, `ip`, `ping`, consulta DNS, HTTP) e os remédios |
| `vega` | O botão na página Rede, o teste no diagnóstico e as orientações |

## Questões abertas

1. **O endereço de checagem da internet:** usar o do NetworkManager
   (`connectivity` no `NetworkManager.conf`), quando existir, ou um endereço
   do projeto Lyra? A proposta usa o do NetworkManager, que já detecta portal
   cativo.
