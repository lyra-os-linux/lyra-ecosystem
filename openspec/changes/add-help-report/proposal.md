# Proposta: "Pedir ajuda" com o relatório

## Por quê

Numa distro pequena, o suporte acontece no fórum e nas issues. Cada pedido de
ajuda começa com uma rodada de "manda a saída do comando X", que custa tempo
dos dois lados e afasta quem não sabe usar o terminal. O relatório do
diagnóstico já reúne quase tudo o que um voluntário precisa, e já sabe
esconder os dados pessoais.

## O que muda

- Um botão **Pedir ajuda** no relatório do diagnóstico. Ele abre um painel
  com:
  - um campo "o que está acontecendo?", com o texto do usuário;
  - a prévia do texto que será compartilhado (Markdown, **com redação
    sempre**), que o usuário pode revisar e editar;
  - três destinos: **Copiar**, **Abrir no fórum** e **Abrir uma issue no
    GitHub**. Os dois últimos abrem o navegador com o texto já preenchido.
- O texto leva só os achados de atenção e falha, o resumo de cada teste e as
  informações do sistema (modelo, versões). Os dados brutos ficam resumidos
  para caber no limite do navegador.

## Fora do escopo

- Enviar automaticamente para qualquer servidor. Nada sai da máquina sem o
  usuário clicar e revisar.
- Uma conta ou um login no Vega.

## Impacto

| Repositório | Mudança |
| --- | --- |
| `vega` | O painel, a montagem do texto e a abertura no navegador |
| `site` | Uma página de ajuda com o link do fórum e o modelo de issue |

Não há mudança no contrato nem no vegad.

## Questões abertas

1. **Destino padrão:** o fórum do Lyra (qual?) ou as Discussions do GitHub.
   Enquanto não houver fórum, a proposta usa as **Discussions do
   `lyraos-desktop`**.
