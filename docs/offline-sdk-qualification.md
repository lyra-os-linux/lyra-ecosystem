# Qualificação do SDK offline em VM nova — 16/09/2026

Estado: pausado a pedido do mantenedor em 16/09/2026; este registro ainda
não aprova a matriz. A passagem com o SDK completo foi interrompida durante
o primeiro componente. Retomar os nove componentes numa VM nova, sem combinar
aprovações parciais anteriores. Logs preservados em `paused-by-user/`.

A VM, discos e raízes temporárias foram removidos após a interrupção.
O inventário RPM do host permaneceu idêntico e o GNOME Shell manteve PID 2075.

## Entradas imutáveis

Fontes GNOME extraídas de nove commits consolidados, com checkouts limpos e
`publishable_sources: true`. O ensaio anterior de 15/09 permanece como histórico;
este kit não reúne resultados parciais daquele teste.

| Componente | Commit |
| --- | --- |
| beam | `3652c3aef36fad5e65b0d78142406c4668273a54` |
| sulafat | `6a201e79d84e9c96a358473c06df27370331feaf` |
| lyra-vega-dbus | `e1a960f21d1253a1df2933756ba4c9709d0233f1` |
| vega | `a263d6b7b434064931545c1aa9989d5a225e1bf9` |
| vegad | `b6cc83329962282979f011a86294af6980192255` |
| lyraos-desktop-welcome | `3ece7a4bdf4272cb93e8e9ed84346e906e698051` |
| lyraos-desktop-updater | `74ca967f6766380a2d7e7652b9ad134942e43410` |
| lyraos-desktop | `0208de6b77fc2eefca67f8b2f185d40898f759b7` |
| lyraos-desktop-sheliak | `64212dd7adc4b3b5563b97325d1a05035720d99b` |

SHA-256 dos manifestos, registrados antes de iniciar a VM:

```text
kit.json  1eaca565eca7ab70a00a973c9801889ba8b3d57a9917982ba069de2b6506c64c
sdk.json  53f0bfd316f0f5e97105c8f746f0e8b63e78b9192122684066c38af5d8742f05
```

As ferramentas permanecem fixadas em `build-toolchains.toml`: Rust/Cargo 1.97.0,
Go 1.27.1, Node 24.18.1, npm 11.16.0 e Python 3.13.13. O SDK arquiva 538 RPMs
x86_64/noarch do repositório OSS oficial Leap 16.1, com chaves públicas, hashes,
assinaturas verificadas e identidades completas. A resolução partiu de RPMdb
vazia e metadados novos; não usou a RPMdb ou caches de pacotes do host.

## Ambiente e método

- Base nova de 167 RPMs, instalada exclusivamente do arquivo local. Rust/Cargo,
  Node/npm, GCC, GTK de desenvolvimento e Bubblewrap estavam ausentes antes
  do provisionamento do SDK.
- VM KVM com quatro vCPUs e 8 GiB, kernel `6.12.0-160100.4-default` do arquivo,
  sem NIC, passagem de GPU, disco físico, pasta pessoal ou caches do host.
- Kit e SDK em disco virtual somente leitura. Digest e assinaturas conferidos
  como usuário comum antes de instalar os RPMs com Zypper dentro da VM.
- Inventário completo instalado exatamente igual ao manifesto: 538 RPMs,
  incluindo epochs, versões, releases e arquiteturas. Entradas `gpg-pubkey`
  não contam como pacotes; as assinaturas usam as chaves arquivadas verificadas.
- Builds como `builder` (UID 1001), em Bubblewrap sem rede, com HOME e caches
  inicialmente vazios. Go veio do kit; não havia SDK ou cache copiado do host.
  O target local começa vazio e pode ser compartilhado entre os nove componentes.

A preparação corrigiu três problemas da fixture antes de instalar o SDK ou
iniciar builds: serial VirtIO limitado a 19 caracteres, ausência de `findmnt`
na base mínima e montagem repetida na retomada. Os registros dessas tentativas
foram preservados. A inspeção final usa `/proc/self/mountinfo`; o controlador
transfere somente o roteiro de teste corrigido por canal local e registra seu
SHA. Fontes e dependências do kit e RPMs permanecem na mídia somente leitura.

## Correção encontrada no Vega GTK

A primeira passagem parou no Vega: o teste
`desktop_toggle_preserves_other_extensions_and_global_preference` procurava
`org.gnome.shell` na instalação do builder e falhava sem GNOME Shell instalado.
A [PR Vega #145](https://github.com/lyra-os-linux/vega/pull/145) substituiu essa
dependência por uma fixture compilada privada, sem schemas pai, preservando
todas as verificações e o backend de memória. O CI adicionou execução com os
diretórios globais de schemas isolados; fmt, Clippy, testes GTK e traduções
passaram. O commit qualificado está integrado à main por merge `874d3e3`.

O primeiro kit e seu resultado reprovado permanecem em `source-kit/` e
`vega-test-failure/`. O kit corrigido é `source-kit-final/`. A passagem final em uma nova VM
recomeçou da base de 167 RPMs; os três componentes antes aprovados não são
reaproveitados como resultado. Nenhum comportamento de runtime foi alterado
por essa correção de teste.

A segunda passagem foi interrompida ao identificar ausência de `findmnt`,
antes que três testes de backup do vegad fossem ignorados. O SDK final
(`sdk-final/`) acrescenta `util-linux-systemd` e `liblastlog2-2`, mantendo
exatamente as versões dos 536 RPMs anteriores. O driver passou a exigir
`glib-compile-schemas`, `findmnt` e `restic`, e Go registra testes/skips em modo
verboso. A passagem interrompida fica em `sdk-incomplete-interrupted/` e não
compõe o resultado final. A base e os caches foram novamente recriados.

## Verificações e limites

Os 38 testes do repositório passaram. O CI exige os checks `validate`,
`readonly-gate` e `offline-build-driver`. As regressões cobrem alteração de
manifesto, RPM e chave, pacote sem assinatura, links, inventário extra/ausente
e recusa antes de criar evidência de build. Um teste negativo real na VM,
como UID 1001, recusou digest incorreto com `SDK_INVALID` e saída 1.

O ensaio valida provisionamento e compilação/testes de código sem rede para
as entradas fixadas. Não demonstra identidade binária byte a byte, build RPM
completo no OBS, instalação da ISO, sessão gráfica, atualização, recuperação,
NVIDIA, Secure Boot ou outros hardwares. Skips dos testes de produto conservam
seus próprios gates. O kit/SDK são artefatos locais preservados; não foram
publicados como RPM nem como release binária.

Evidências locais: `analysis/2026-09-16/ecosystem-offline-sdk/`, incluindo
`approved-inputs.json`, `source-commits-final.json`, `sdk-plan.json`,
`archive-signatures.log`, `image.json`, `boot-assets.json`, `qemu-command.json`,
`fixture-corrections.json`, `harness-sha256.txt` e `unit-tests.log`.
