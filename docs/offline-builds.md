# Builds GNOME com ferramentas fixadas e dependências arquivadas

A issue [lyra-ecosystem #4](https://github.com/lyra-os-linux/lyra-ecosystem/issues/4)
passa a ter um único ponto de entrada: `scripts/offline-builds.py`.
O arquivo `build-toolchains.toml` fixa as ferramentas, bibliotecas nativas e os
nove componentes compilados desta qualificação GNOME. O catálogo de outros
consumidores permanece preservado; eles não entram nesta matriz.

A [qualificação local de 15/09/2026](offline-builds-qualification.md) registra
os nove componentes aprovados, a correção encontrada no teste do vegad e os
limites do ensaio.

## Contrato de reprodutibilidade

O kit reúne fontes de cada checkout, commit de origem, alterações locais,
lockfiles, dependências Rust/Go/npm e a distribuição Go usada. Cada arquivo
compactado tem SHA-256; o manifesto `kit.json` também tem um digest que precisa
ser obtido de uma fonte confiável independente do diretório transferido.
Checksums comprovam integridade contra esse digest, não identidade do editor.
Para entrega pública, guardar o digest no registro de release assinado/aprovado.

A verificação usa Bubblewrap como usuário comum: namespace sem rede, sistema
base somente leitura, HOME e caches inicialmente vazios e nenhuma montagem da
sessão D-Bus, pasta pessoal ou fontes originais. Cargo opera com `--locked
--offline`; Go usa `-mod=vendor`, `GOTOOLCHAIN=local`, proxy/sumdb desativados;
npm recebe `--offline` e cache arquivado. Não há fallback para build no host se
o isolamento estiver indisponível. Os comandos de teste são definidos no
verificador; um manifesto não fornece shell, argv ou comandos administrativos.

Isso prova que fontes e dependências arquivadas bastam para compilar/testar
sobre o SDK qualificado. **Não equivale a uma imagem de sistema vazia, a um
build RPM completo ou a binários idênticos byte a byte.** Bibliotecas nativas,
compilador C, Rust/Cargo, Node/npm e Python vêm do SDK openSUSE instalado; suas
versões e o inventário de NEVRAs ficam no recibo. Go é incluído porque a cópia
usada no desenvolvimento era temporária. Nenhum cache do desenvolvedor é
montado durante o ensaio. O target pode ser reutilizado entre os componentes
do mesmo ensaio, depois de iniciar vazio.

Para reproduzir em outra máquina, instalar o mesmo SDK a partir dos RPMs
arquivados da base e transferir o kit completo. Uma atualização do SDK exige
revisão dos pins e novo recibo, sem aceitar silenciosamente versões diferentes.
O arquivo de RPMs do SDK é independente do kit de fontes/dependências; ambos
devem acompanhar a evidência. Ver [provisionamento offline do SDK](offline-sdk.md).

## Preparação do SDK

O baseline é openSUSE Leap 16.1 x86_64. As versões exatas ficam em
`build-toolchains.toml`, não em um seletor móvel como `stable` ou `latest`.
Preservar os mínimos declarados nos projetos (por exemplo `rust-version` e a
diretiva `go`); esses mínimos não são os pins da qualificação integrada.

Pacotes de desenvolvimento usados incluem Rust/Cargo, GCC, pkg-config,
GTK4/libadwaita, GTK3/WebKitGTK 4.1/libsoup, VTE GTK4 >=0.80, gettext-tools,
D-Bus, GnuPG, Node/npm, Python e bubblewrap. Em Leap, o SDK VTE vem de
`vte-devel`; a biblioteca de execução sozinha não fornece o arquivo pkg-config.
Os `BuildRequires` dos RPMs continuam canônicos para a construção dos pacotes.

Nenhum comando deste driver usa sudo/pkexec ou instala pacotes automaticamente.
O administrador provisiona o SDK e então executa, sem root:

```sh
python3 scripts/offline-builds.py doctor --go-root /caminho/go-1.27.1
```

O Go precisa ser Linux amd64 da versão fixada. O driver confere a versão
reportada e inclui a árvore completa (incluindo licença) no kit. A obtenção do
SDK inicial deve usar o canal de distribuição aprovado e seus checksums.

## Preparar uma vez com rede

```sh
python3 scripts/offline-builds.py prepare \
  --workspace /caminho/LyraOS \
  --go-root /caminho/go-1.27.1 \
  --output /artefatos/gnome-kit-001
```

A preparação resolve somente os lockfiles existentes, sem atualizá-los. Cargo
vendor preserva crates de registro e dependências Git fixadas; Go conserva
`go.mod`/`go.sum`; npm ci conserva `package-lock.json` e arquiva seu cache com
integridades SRI. Fontes vendorizadas de todas as plataformas podem ser
necessárias pelo lockfile, embora o alvo de build desta matriz seja Linux.

A operação usa cópias dos checkouts, não altera os originais e publica o diretório
somente ao terminar. Um diretório de saída existente é recusado: não substituir
um kit sob a mesma identidade. Falhas removem os temporários de preparação.

Para worktrees em posições diferentes, `--sources sources.json` recebe um mapa
`{"vega": "/caminho/worktree-vega", ...}`. Entradas não sobrescritas usam o
workspace. `--component ID` pode ser repetido para um subconjunto, que é
registrado explicitamente; não chamar um subconjunto de matriz completa.

Por padrão, checkouts sujos são recusados. `--allow-dirty` existe para a
qualificação local combinada com o mantenedor: inclui arquivos não ignorados,
registra conteúdo/hash e deixa `publishable_sources: false`. Revisar a relação
antes de transferir qualquer kit. Essa opção não autoriza publicar fontes
locais nem substituir a qualificação posterior do commit consolidado.

## Verificar sem rede

Copiar o kit e obter o SHA-256 aprovado de `kit.json` pelo registro da entrega.
O arquivo adjacente `kit.json.sha256` serve como recibo local de criação; não é
uma segunda fonte de confiança se recebido junto de um kit desconhecido.

```sh
python3 scripts/offline-builds.py verify \
  --kit /artefatos/gnome-kit-001 \
  --expected-sha256 DIGEST_APROVADO_DE_KIT_JSON \
  --sdk /artefatos/gnome-sdk-001 \
  --expected-sdk-sha256 DIGEST_APROVADO_DE_SDK_JSON \
  --output /evidencias/gnome-offline-001
```

O Go é extraído do kit; não precisa estar instalado no PATH. O verificador
confere hashes antes de extrair/executar, recusa travessia de caminhos,
links externos, arquivos especiais e duplicatas. O SDK precisa corresponder
aos pins do kit. O teste de rede e cache vazio precede os testes dos produtos.

Os argumentos `--sdk` e `--expected-sdk-sha256` são usados juntos. Antes de
compilar, esse modo verifica todos os RPMs, as assinaturas com as chaves
arquivadas e o inventário instalado completo, incluindo versões, releases,
epochs e arquiteturas. A política fixada deve ser a mesma do kit de fontes.
Qualquer pacote extra ou ausente, exceto as entradas públicas `gpg-pubkey`,
impede o ensaio. Sem esses argumentos, continua disponível a qualificação local
anterior, que inventaria o SDK mas não comprova seu provisionamento arquivado.

Rust: metadata offline, testes do workspace/all-targets e build do workspace.
Go: inventário vendor, testes sem cache e build. Sheliak: npm ci offline,
testes e TypeScript. Não abre aplicações GTK nem executa ações administrativas.
Testes funcionais que exigem VM, GNOME real ou hardware permanecem nos gates de
cada componente; skips declarados nesses testes não equivalem a qualificação.

`result.json` só existe após todos os componentes passarem. `progress.json`
registra componentes já aprovados; `failure.json` registra falhas tratadas depois
de criar o diretório de evidências. Rejeições anteriores saem como JSON no
stderr. Cancelamento por Ctrl+C retorna 130 e conserva os logs/progresso, sem
gerar um resultado de aprovação.
Cada componente tem um log. O scratch é removido inclusive em falha, mantendo
kit e evidências; `--scratch` permite escolher outro disco e `--timeout` limita
cada comando. Não remover as toolchains/origens antes de concluir a preparação.

## Falhas estruturadas

| Código / saída | Significado |
| --- | --- |
| `CONFIG_INVALID` / 2 | Parâmetro, política ou formato inválido |
| `TOOL_MISSING` / 10 | Executável necessário ausente |
| `TOOL_VERSION_MISMATCH` / 11 | Ferramenta/biblioteca fora do pin |
| `DEPENDENCY_MISSING` / 12 | Lockfile, vendor, biblioteca ou resolução indisponível |
| `SOURCE_INVALID` / 13 | Checkout ausente/sujo, fonte mudou ou link externo |
| `INTEGRITY_FAILED` / 14 | Hash, conteúdo de arquivo ou extração recusados |
| `ISOLATION_UNAVAILABLE` / 15 | Namespace de rede/arquivos não foi criado |
| `CODE_FAILED` / 20 | Falha na compilação/testes após resolver dependências |
| `COMMAND_TIMEOUT` / 21 | Tempo excedido; grupo de processos encerrado |

## Relação com OBS e releases

O kit é uma evidência/fonte arquivada para reconstrução, não um RPM nem um envio
automático ao OBS. Os geradores de fontes e specs de cada repositório continuam
responsáveis pelos nomes/camadas esperados por seu pacote. Para release:

1. Consolidar e revisar os commits; exigir checkouts limpos.
2. Gerar kit e fontes OBS dos mesmos commits/lockfiles; registrar toolchain e hashes.
3. Qualificar a matriz offline e o build RPM real nos repositórios responsáveis.
4. Publicar fontes e recibos aprovados, preservando o mirror do SDK e suas licenças.
5. Executar os gates de composição/ISO sem transformar testes de código em prova
   de instalação, atualização, boot, rollback ou hardware.

A ordem do ciclo permanece: issues de implementação → auditoria Desktop #78 →
construção/testes locais da ISO GNOME única, com NVIDIA opcional pelo Vega →
Alpha 8 após aprovação dos gates. A estratégia separada de ISOs Server permanece
nas respectivas issues.
