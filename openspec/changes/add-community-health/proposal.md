# Proposta: arquivos de comunidade do Lyra OS

## Por quê

Ciclo de sustentação da 16.1, aprovado pelo mantenedor em 30/10/2026. O Lyra OS
passou de 3 mil downloads, e a comunidade tende a crescer. Hoje quem chega ao
GitHub não encontra código de conduta, política de segurança, modelos de issue
(só o "Pedir ajuda" do Desktop) nem um guia de como reportar ou contribuir. O
`CONTRIBUTING.md` do Desktop e do Server é o bootstrap da estação de
desenvolvimento, não um guia para a comunidade. O GitHub dá 62% de saúde de
comunidade ao `lyraos-desktop`.

## O que muda

1. **Repositório `.github` da organização** com os arquivos que o GitHub aplica
   a todos os repositórios que não têm os seus:
   - `CODE_OF_CONDUCT.md`: Contributor Covenant 2.1 em português;
   - `CONTRIBUTING.md`: como pedir ajuda, reportar um defeito, sugerir uma
     melhoria e contribuir com código (fluxo de PR, idioma, testes, OpenSpec);
   - `SECURITY.md`: como reportar uma vulnerabilidade em privado, pelo
     relatório privado do GitHub, e o que esperar;
   - `SUPPORT.md`: onde pedir ajuda (Discussions Q&A do `lyraos-desktop`, o
     "Pedir ajuda" do Vega, a documentação do site);
   - modelos padrão: defeito, sugestão e `config.yml` com os links de contato
     (Discussions e documentação), e um modelo de PR.
2. **Modelos por edição** no `lyraos-desktop` e no `lyraos-server`: formulários
   de defeito com versão, edição, hardware, passos e o relatório do Vega; o
   "Pedir ajuda" do Desktop continua.
3. **Relatório privado de vulnerabilidades** ligado nos repositórios públicos.
4. **Site**: páginas "Como reportar um problema" e "Contribuir" na
   documentação (pt, en, es, it), apontando para os mesmos caminhos.
5. **Catálogo**: o `.github` entra no `products.toml` como repositório de
   organização, sem build nem consumidores.

## Fora do escopo

- Fórum próprio, chat (Matrix, Telegram, Discord) ou lista de e-mail.
- Tradução dos arquivos de comunidade para outros idiomas além do português
  (o site já cobre en, es e it).
- Mudanças no `CONTRIBUTING.md` técnico do Desktop e do Server, além de um link
  para o guia da organização.

## Impacto

| Repositório | Mudança |
| --- | --- |
| `.github` (novo) | Arquivos de comunidade e modelos padrão |
| `lyraos-desktop`, `lyraos-server` | Formulários de defeito por edição, `config.yml`, link para o guia |
| `site` | Páginas "Como reportar um problema" e "Contribuir" |
| `lyra-ecosystem` | `.github` no catálogo |

Nenhum pacote, ISO ou contrato muda.

## Decisões

1. Criar o repositório `.github` da organização: sim (mantenedor, 30/10/2026).
2. Contato do código de conduta: só privado pelo GitHub, sem e-mail público
   (mantenedor, 30/10/2026).
