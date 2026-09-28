# SDK arquivado e provisionamento sem rede

`scripts/offline-sdk.py` registra e verifica o conjunto de RPMs usado pelo
verificador GNOME. Não instala pacotes, não solicita privilégios e não altera
a base RPM do sistema: as chaves entram somente em uma base temporária, removida
ao terminar. A instalação do SDK pertence à preparação de uma máquina descartável.

## Preparar os arquivos

Em um diretório novo, guardar:

```text
sdk/
  keys/    chaves públicas oficiais previamente verificadas (.asc)
  rpms/    conjunto completo de RPMs binários e suas dependências (.rpm)
```

Resolver a base e o SDK em uma raiz RPM inicialmente vazia, com metadados novos
do repositório oficial Leap 16.1 e verificação GPG habilitada. Baixar a dependência
completa, usando as versões canônicas de `build-toolchains.toml`. Preservar a
origem, o plano de resolução, os identificadores das chaves e os logs. Não usar
a RPMdb, a árvore `/usr` ou os caches de pacotes da estação como imagem inicial.
As versões RPM podem diferir da versão interna da ferramenta; por exemplo,
o npm embarcado em `npm24` deve corresponder ao pin de `npm --version`.

O conjunto inclui a base necessária ao boot de teste, o SDK nativo e as ferramentas
dos testes. Go permanece no kit de fontes. Os RPMs precisam ter assinatura válida;
um RPM que possui somente digests íntegros é recusado. Manter fontes/licenças
correspondentes e a política de distribuição ao arquivar ou compartilhar artefatos.

Após revisar origem e chaves, selar como usuário comum:

```sh
python3 scripts/offline-sdk.py seal \
  --sdk /artefatos/gnome-sdk-001 --policy build-toolchains.toml
```

Guardar o SHA-256 retornado em um registro aprovado independente do diretório
transferido. `sdk.json.sha256` ao lado dos arquivos é um recibo, não uma segunda
fonte de confiança. O manifesto registra hash das chaves, hash/identidade de cada
RPM e hash da política. Um arquivo já selado não é sobrescrito.

## Qualificar em uma VM limpa

1. Instalar uma base mínima nova a partir do próprio arquivo de RPMs. Registrar
   seu inventário e demonstrar que Rust/Cargo, Node/npm, GCC, GTK de desenvolvimento
   e Bubblewrap ainda não estão instalados.
2. Iniciar a VM com disco de sistema descartável, sem placa de rede, sem passagem
   de GPU/discos físicos e sem montagens da pasta pessoal ou caches do host. Entregar
   SDK e kit em um segundo disco somente leitura.
3. Conferir o SHA aprovado e executar `offline-sdk.py verify` como usuário comum.
   Só então, como administrador **da VM**, instalar os RPMs via Zypper, de um
   repositório local `plaindir`, com assinatura de pacote obrigatória e versões
   exatamente iguais às do manifesto. A ausência de assinatura de metadados desse
   repositório local não dispensa o digest aprovado nem a assinatura de cada RPM.
4. Como usuário comum, executar o comando abaixo. O inventário instalado deve ser
   exatamente o arquivado; não corrigir dependências automaticamente durante o gate.
5. Guardar logs e resultado; desligar a VM e remover seus discos e diretórios
   descartáveis. Preservar os arquivos de entrada e a evidência.

```sh
python3 scripts/offline-builds.py verify \
  --kit /media/kit/source-kit --expected-sha256 SHA_APROVADO_DO_KIT \
  --sdk /media/kit/sdk --expected-sdk-sha256 SHA_APROVADO_DO_SDK \
  --output /evidencias/ensaio-001
```

A verificação exige arquivos e identidades exatos, rejeita RPMs adicionais,
links e versões distintas, verifica assinaturas em base temporária e compara
o inventário completo. As entradas `gpg-pubkey` da RPMdb são a única exceção à
comparação de pacotes; elas não são usadas para confiar nos RPMs do arquivo.
O verificador sempre importa as chaves arquivadas e conferidas pelo digest.

O resultado do driver inclui `archived_sdk` quando essa verificação passou.
O campo histórico `native_sdk_reused` continua indicando que o driver usa o SDK
do sistema onde roda; a evidência externa de provisionamento é o que demonstra
que esse sistema veio dos RPMs arquivados, e não de uma cópia do host.

## Limites da evidência

Uma passagem deve identificar commits, hashes dos dois manifestos, versões das
ferramentas, inventários antes/depois, UID dos builds, ausência de rede, comandos,
testes ignorados e limpeza. Exigir os nove componentes na mesma passagem final;
resultados parciais ou uma tentativa com falha permanecem registrados como tais.

Esse ensaio qualifica provisionamento e compilação/testes sobre um SDK fixado.
Não produz uma ISO, não prova igualdade byte a byte de binários nem qualifica
firmware, Secure Boot, GPU ou os testes de integração que exigem sessão gráfica.
