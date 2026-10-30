# Contribuindo com o Lyra OS

Obrigado pelo interesse! O Lyra OS é uma distribuição pequena, feita com
cuidado sobre o openSUSE Leap 16.1. Toda ajuda conta: uma pergunta bem feita,
um relato de defeito com os passos certos, uma tradução ou um PR.

Ao participar, você concorda com o [código de conduta](CODE_OF_CONDUCT.md).

## Precisa de ajuda?

Veja o [suporte](SUPPORT.md). Dúvidas de uso vão para as
[Discussions](https://github.com/lyra-os-linux/lyraos-desktop/discussions/categories/q-a),
não para as issues.

## Reportar um defeito

1. Atualize o sistema (`sudo zypper up` ou Vega → Software) e veja se o
   problema continua.
2. Procure nas issues abertas se ele já foi relatado; se sim, acrescente o que
   for novo num comentário.
3. Abra a issue no repositório certo:
   - problema da instalação, da imagem ou do sistema como um todo:
     [lyraos-desktop](https://github.com/lyra-os-linux/lyraos-desktop/issues/new/choose)
     ou [lyraos-server](https://github.com/lyra-os-linux/lyraos-server/issues/new/choose);
   - problema de um aplicativo do Lyra: o repositório dele (Vega, Beam,
     Sulafat, Lyra Downloads...). Na dúvida, use o da edição.
4. Preencha o formulário: versão (`cat /etc/os-release`), o que você fez, o que
   esperava e o que aconteceu. O texto do **Pedir ajuda** do Vega ajuda muito e
   já sai sem dados pessoais.

**Falhas de segurança** seguem a [política de segurança](SECURITY.md), nunca
uma issue pública.

## Sugerir uma melhoria

Abra uma issue do tipo **Sugestão** contando o problema que você quer
resolver, não só a solução. O Lyra segue alguns princípios que pesam na
decisão: estabilidade em primeiro lugar, reaproveitar o openSUSE em vez de
reinventar, e ferramentas que ajudem a pessoa a agir. Mudanças grandes passam
por uma especificação (OpenSpec) antes do código.

## Contribuir com código

- Cada repositório é independente, com seu README, testes e, às vezes, um
  `AGENTS.md` com regras próprias: leia antes de mudar.
- Trabalhe numa branch e abra um PR para a `main`. O CI precisa passar.
- Mantenha o PR pequeno e com um propósito só; descreva o que muda e como foi
  testado.
- Textos, commits e documentação são em português. Código e comentários seguem
  o estilo do arquivo.
- Comandos comuns: Rust `cargo test --locked`, `cargo fmt --all --check`,
  `cargo clippy --locked --all-targets --all-features -- -D warnings`; Go
  `go test ./...`; empacotamento `python3 -m unittest discover -s tests -v`.
- O mapa dos repositórios e dos contratos entre eles está no
  [lyra-ecosystem](https://github.com/lyra-os-linux/lyra-ecosystem).
- Na versão estável, só entram correções de defeitos, travamentos, segurança e
  desempenho crítico; funcionalidades novas vão para o próximo ciclo.

## Traduções

O sistema e o site estão em português, inglês, espanhol e italiano. Correções
de tradução são bem-vindas como PR no repositório do aplicativo (arquivos `po/`
ou de interface) ou no [site](https://github.com/lyra-os-linux/site).
