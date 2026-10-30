# Comunidade

## ADDED Requirements

### Requirement: Arquivos de comunidade da organização
Todo repositório público do Lyra OS DEVE oferecer, próprio ou herdado do
`.github` da organização, código de conduta, guia de contribuição, política de
segurança, página de suporte e modelos de issue e de PR.

#### Scenario: repositório sem arquivos próprios
- **WHEN** alguém abre uma issue no `vega-cli`
- **THEN** o GitHub oferece os formulários padrão e os links para as Discussions e a documentação

### Requirement: Relato de defeito por edição
O `lyraos-desktop` e o `lyraos-server` DEVEM oferecer formulários de defeito
com edição, versão, passos, esperado e obtido obrigatórios, e o texto do
"Pedir ajuda" do Vega como opcional. Issues em branco NÃO DEVEM ser oferecidas.

#### Scenario: defeito no Server
- **WHEN** um usuário abre "Defeito" no `lyraos-server`
- **THEN** o formulário pede a versão, os passos e o resultado, e aplica os rótulos `bug` e `server`

### Requirement: Vulnerabilidades em privado
O projeto DEVE aceitar relatos de vulnerabilidade em privado pelo GitHub, e o
`SECURITY.md` DEVE dizer como reportar, quais versões recebem correção e como
ela é entregue. Vulnerabilidades NÃO DEVEM ser pedidas em issues públicas.

#### Scenario: falha de segurança no vegad
- **WHEN** alguém encontra uma falha no vegad
- **THEN** o `SECURITY.md` o leva ao relatório privado do repositório, sem expor o problema
