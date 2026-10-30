# Design: arquivos de comunidade

- **Onde:** o GitHub usa os arquivos de comunidade do repositório `.github` da
  organização em qualquer repositório que não tenha os seus. Assim, um texto só
  vale para os demais repositórios, e cada um pode sobrescrever quando precisar
  (o Desktop e o Server ganham formulários próprios).
- **Idioma:** português, como o resto do projeto; os formulários aceitam
  relatos em inglês e espanhol.
- **Formulários de issue (YAML):** campos obrigatórios para edição, versão
  (`cat /etc/os-release`), passos para reproduzir, esperado e obtido; campo
  opcional para o texto do "Pedir ajuda" do Vega, que já sai redigido.
  `config.yml` desliga issues em branco e aponta Discussions e documentação.
- **Rótulos:** os formulários aplicam `bug` ou `enhancement`, e `desktop` ou
  `server`; a triagem adiciona a prioridade (P0 a P3), como hoje.
- **Segurança:** relatório privado do GitHub (Security → Report a
  vulnerability), sem e-mail no texto. O `SECURITY.md` diz quais versões
  recebem correções (a 16.1 em sustentação) e que a correção sai por
  atualização no OBS.
- **Código de conduta:** Contributor Covenant 2.1, tradução oficial em
  português. O contato é privado pelo GitHub (mensagem ao mantenedor ou
  relatório privado), sem e-mail público.
- **Site:** duas páginas novas na documentação, com o mesmo conteúdo resumido,
  ligadas a partir de "Pedir ajuda".
