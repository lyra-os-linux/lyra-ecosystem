# Integração de componentes nas edições

O artefato integrado é o RPM publicado no OBS. O commit Git identifica a
origem; o `srcmd5` aprovado identifica exatamente o conteúdo consumido pela
edição.

## Fluxo

1. A mudança entra no repositório proprietário e passa pelos testes locais.
2. O pacote é construído no projeto OBS de staging correspondente.
3. O RPM é validado em openSUSE Leap 16.0, incluindo smoke test proporcional
   ao risco do componente.
4. A promoção para o projeto de release registra revisão e evidência.
5. A edição atualiza ou confirma o `srcmd5` aprovado em `obs/projects.toml`.
6. O build da imagem usa somente os pacotes aprovados.
7. O candidato passa pelos testes de instalação, primeiro boot e integração.

## Desenvolvimento e release

Overrides locais podem existir para reduzir o ciclo de desenvolvimento, desde
que sejam explícitos e deixem a imagem marcada como não publicável. Um gate de
release nunca usa código injetado diretamente de outro checkout: ele valida os
mesmos RPMs que serão entregues.

## Evidência mínima

Cada promoção registra commit de origem, revisão OBS, alvo, resultado dos
testes e responsável. Componentes privilegiados exigem também teste negativo
de autorização e compatibilidade do contrato. Empacotamentos de terceiros
exigem verificação de checksum, licença e desativação de atualizadores
embutidos quando essa for a política do pacote.

## Reversão

A edição mantém o último `srcmd5` aprovado. Uma regressão volta o pacote à
revisão conhecida no OBS, restaura o baseline e reconstrói a imagem; não se
regrava silenciosamente um artefato sob a mesma identidade.
