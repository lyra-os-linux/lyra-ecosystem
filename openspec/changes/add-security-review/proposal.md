# Proposta: revisão de segurança no Vega

## Por quê

Antivírus quase não protege um desktop Linux. O risco real é configuração e
exposição: um serviço aberto para a rede sem que o usuário saiba, patches de
segurança atrasados, SSH aceitando senha de root, disco sem criptografia num
notebook. Hoje o Lyra não mostra nada disso em linguagem de usuário. O YaST,
que o Vega substitui no Leap 16, também não mostrava de forma unificada.

O diagnóstico de saúde (vega#165), entregue em 29/10/2026, mostrou o
caminho. O usuário entende o relatório e age com o **Resolver**, que aplica
consertos seguros, ou com orientação e atalho. A ferramenta precisa ser útil,
ou o usuário desiste da distro.

## O que muda

1. **Exposição de rede**, uma capacidade nova (`network-exposure`). O Vega
   lista o que escuta na rede: programa, porta, se escuta só na própria máquina
   ou na rede, e se o firewall libera o acesso. Ele destaca o que está de fato
   exposto e oferece fechar no firewall ou parar o serviço.
2. **Teste de segurança no diagnóstico**, que estende a capacidade
   `security-diagnostics` do diagnóstico existente. O teste `security`
   verifica:
   - firewall ligado;
   - portas expostas;
   - patches de segurança pendentes;
   - configuração do SSH;
   - SELinux;
   - Secure Boot;
   - criptografia do disco do sistema;
   - contas sem senha;
   - política do `sudo`.

   Os achados consertáveis ganham remédios novos no `Repair`. Os demais ganham
   orientação e atalho no Vega.

## Fora do escopo

- Antivírus residente. Um ClamAV sob demanda (verificar pasta e downloads do
  Lyra Downloads) fica para uma proposta separada.
- Atualizações de segurança automáticas, também em proposta própria.
- Mudar a política de SELinux da distro: a decisão é da edição Desktop e vai
  para um ADR. Aqui o teste só reporta o estado.
- Criptografia de disco no instalador.

## Impacto

| Repositório | Mudança |
| --- | --- |
| `lyra-vega-dbus` | `Firewall.ListListening` (novo) e o teste `security` e os remédios novos no `Diagnostics` (aditivo; capabilities `network-exposure-v1` e `diagnostics-v3`) |
| `vegad` | Coleta das portas (`ss`), cruzamento com o firewalld, teste `security`, remédios |
| `vega` | Seção "Portas abertas" na página Firewall, teste e orientações no Diagnóstico |
| `lyraos-desktop` | ADR sobre a política de SELinux (questão aberta, abaixo) |

Nenhuma interface existente muda, então os consumidores atuais não quebram.

## Questões abertas

1. **SELinux:** o Leap 16 vem com SELinux em modo enforcing. Na workstation
   de referência ele está `Disabled`, e o Desktop não registra decisão sobre
   isso. Até o ADR, o teste reporta o estado como informação, não como atenção.
2. **SSH na edição Server:** lá o SSH é o acesso de administração. O teste
   DEVE considerar o perfil (`desktop`/`server`) ao julgar
   `PasswordAuthentication`.
