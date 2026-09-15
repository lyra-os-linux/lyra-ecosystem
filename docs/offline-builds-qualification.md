# Qualificação local de compilação offline — 15/09/2026

A implementação da issue Ecosystem #4 foi qualificada sobre o SDK openSUSE
Leap 16.1 desta máquina, com fontes/dependências arquivadas e namespaces sem
rede. Os nove componentes abaixo passaram seus comandos de compilação/teste
previstos em `offline-builds.py`. Os pins estão em `build-toolchains.toml`.

| Componente | Commit de origem | Estado das fontes |
| --- | --- | --- |
| beam | `f29e73b2bfa4` | limpa |
| sulafat | `a799db5beae5` | limpa |
| lyra-vega-dbus | `c41e2abb0f4d` | limpa |
| vega | `124eaa2551b3` | limpa |
| vegad | `a11d45f93d93` | teste local corrigido |
| lyraos-desktop-welcome | `def3b9cce0ad` | limpa |
| lyraos-desktop-updater | `662dbe2c1173` | implementação local Desktop #13 |
| lyraos-desktop | `a61fa000e4d9` | limpa |
| lyraos-desktop-sheliak | `c279140d8309` | limpa |

## Resultado e correção encontrada

Beam, Sulafat, lyra-vega-dbus e Vega GTK passaram na execução registrada em
`verification-final/`. Em seguida, o teste `TestFlatpakUserCmdKeepsUnprivilegedWorkerIdentity`
do vegad falhou porque pressupunha que `/run/user/1001` existisse no host.
O teste passou a criar `t.TempDir()`, mantendo as verificações de UID,
credenciais e ambiente. Nenhum comportamento do daemon foi alterado.

Uma segunda passagem, também com caches inicialmente vazios e sem rede,
aprovou vegad corrigido, Welcome, updater, instalador e Sheliak. A qualificação
combina esses cinco resultados com os quatro anteriores, por hash de arquivo;
não transforma o relatório da tentativa que falhou em sucesso. As ferramentas,
o SDK nativo e a distribuição Go permaneceram iguais entre as passagens.

Os nove arquivos aprovados foram reunidos em `kit-qualified`, sem modificar
seus bytes. O manifesto registra os dois kits de origem. SHA-256 de `kit.json`:

```text
ff687b1de75dd561dc4128900e5940d18507981f1eb68019224b2d270add79a2
```

Para repetir os nove componentes numa única execução sobre esse kit:

```sh
python3 scripts/offline-builds.py verify \
  --kit /artefatos/kit-qualified \
  --expected-sha256 ff687b1de75dd561dc4128900e5940d18507981f1eb68019224b2d270add79a2 \
  --output /evidencias/nova-verificacao
```

O kit ocupa cerca de 408 MiB; contém fontes, dependências e a distribuição Go,
mas não o SDK inteiro. Os 1.008 arquivos de origem foram conferidos novamente
contra os snapshots finais. O kit é **somente local**, com
`publishable_sources: false` pelos dois conjuntos de alterações sem commit na
data do ensaio. A integração posterior não altera esse recibo: gerar outro kit
dos commits consolidados, incluindo as correções posteriores da issue #25.

## Verificação do driver e limites

Os 26 testes Python do repositório e os contratos do catálogo passaram.
As regressões cobrem hashes alterados, caminhos/links de arquivos, fontes sujas,
versões incorretas, timeout de processos e preservação de evidências existentes.
Três ensaios da CLI recusaram manifesto adulterado, arquivo de dependências
faltante e Rust fora do pin antes de iniciar a compilação.

Foram instalados somente `vte-devel` e `typelib-1_0-Vte-3_91`, ambos
`0.80.5-160100.2.1`, que faltavam no SDK. Nenhum pacote existente foi atualizado
ou removido. Os três diretórios temporários dos ensaios e os de preparação
foram removidos; nenhuma VM/disco de VM foi criado, e a sessão GNOME foi mantida.

Este registro prova compilação/testes de código com caches limpos sobre o SDK
local inventariado. Não prova provisionamento de uma máquina vazia, construção
RPM, instalação, boot, atualização real, rollback, hardware ou saída binária
idêntica. Testes de integração ignorados por dependerem de VM/hardware conservam
seus gates próprios. A consolidação dos commits, preservação do SDK/mirror,
qualificação de release e testes das duas ISOs continuam necessários.

Evidências locais: `analysis/2026-09-15/ecosystem-offline-4/qualification.json`,
`verification-final/`, `verification-remaining/`, `qualified-sources-match.json`
e `cleanup-result.json`. A passagem exploratória anterior em `verification/`
foi cancelada para atualizar o pin VTE e não entra neste aceite combinado.
