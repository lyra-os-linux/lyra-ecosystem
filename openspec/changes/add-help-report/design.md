# Design: Pedir ajuda

- Só no Vega: `ui/js/pages/hardware-diagnostics.js` ganha o painel. O texto
  sai do relatório com `redact = true`, que é o mesmo da exportação, mais as
  contas, que a proposta de segurança já põe na lista de redação.
- Abrir no navegador usa o comando `open_uri`, que já existe e aceita só
  `https://`. A URL de issue usa `title` e `body` na query, codificados e
  limitados (cerca de 8 KB, por isso o limite de 6.000 caracteres no texto).
- O modelo de issue `.github/ISSUE_TEMPLATE/help.md` no `lyraos-desktop` dá o
  mesmo formato a quem abrir a issue pelo site.
