# Liberar espaço

## Requirements

### Requirement: Medir sem alterar
O vegad DEVE oferecer `Cleanup.Scan`, que mede cada categoria do sistema sem
apagar nada e devolve id, bytes recuperáveis, se pode ser limpa agora e um
detalhe. Abrir a seção NÃO DEVE pedir senha.

#### Scenario: abrir Liberar espaço
- **WHEN** o usuário da sessão local ativa abre Armazenamento → Liberar espaço
- **THEN** cada categoria aparece com o tamanho, sem diálogo de senha

#### Scenario: categoria vazia
- **WHEN** não há nenhum core dump
- **THEN** a categoria `coredumps` aparece com 0 bytes e o botão Limpar desabilitado

### Requirement: Categorias do sistema
O vegad DEVE medir e limpar estas categorias:

| id | Mede | Limpa |
| --- | --- | --- |
| `coredumps` | `/var/lib/systemd/coredump` | todos os arquivos de core dump |
| `journal` | arquivos arquivados acima de 500 MB que terminam antes do boot anterior | apaga só esses arquivos, do mais antigo ao mais novo; o boot atual e o anterior ficam |
| `package-cache` | `/var/cache/zypp/packages` | `zypper clean`, só os pacotes baixados; os metadados ficam |
| `flatpak-unused` | os runtimes que `flatpak uninstall --unused --system` removeria | esse mesmo comando |
| `old-kernels` | os kernels que o `purge-kernels` removeria, pela regra `multiversion.kernels` | o `purge-kernels`, dentro de um par de snapshots; um plano com o kernel em uso ou o mais novo é recusado |
| `snapshots` | os snapshots que a limpeza do Snapper removeria (`number`, `timeline`) | `snapper cleanup number` e `timeline`, que respeitam a política configurada |

Os bytes DEVEM ser os que de fato serão liberados. Onde não dá para medir
antes (snapshots sem quotas do btrfs), o item DEVE mostrar a quantidade e
"tamanho desconhecido", nunca um número inventado.

#### Scenario: core dumps
- **WHEN** existem 30 arquivos em `/var/lib/systemd/coredump` somando 210 MB
- **THEN** `Scan` devolve `coredumps` com 210 MB, e `Clean` deixa o diretório vazio

#### Scenario: kernel em uso
- **WHEN** há três kernels instalados e o sistema roda no do meio
- **THEN** `old-kernels` nunca inclui o kernel em uso, nem o mais novo

### Requirement: Limpar com confirmação e progresso
QUANDO o usuário pede para limpar, o Vega DEVE confirmar listando cada
categoria e o tamanho, e o vegad DEVE executar `Cleanup.Clean(ids)` como um
job, com progresso, resultado por categoria e os bytes liberados de fato.
`Clean` DEVE recusar id desconhecido com `NotSupported`.

#### Scenario: limpar tudo o que for seguro
- **WHEN** o usuário confirma "Limpar tudo o que for seguro" com `coredumps` e `package-cache`
- **THEN** os dois são limpos, o Vega mostra o total liberado e a medição é refeita

### Requirement: Exclusividade
SE houver uma transação de software, snapshot, backup ou diagnóstico em
andamento, ENTÃO `Clean` DEVE recusar com `Busy`. `old-kernels` e
`snapshots` NÃO DEVEM rodar ao mesmo tempo que o zypper.

#### Scenario: atualização em curso
- **WHEN** um `UpdateAll` está rodando e o usuário pede `package-cache`
- **THEN** `Clean` responde `Busy` e nada é apagado

### Requirement: Categorias do usuário
O Vega DEVE medir e limpar, na sessão e sem senha:

| id | O quê |
| --- | --- |
| `trash` | `~/.local/share/Trash` (arquivos e informações) |
| `thumbnails` | `~/.cache/thumbnails` |
| `user-cache` | cada subpasta de `~/.cache`, listada por aplicativo com o tamanho |
| `user-flatpak-unused` | `flatpak uninstall --unused --user` |

Em `user-cache`, o usuário DEVE poder escolher subpastas. O Vega DEVE avisar
que um aplicativo aberto pode recriar o cache ou perder dados temporários, e
DEVERIA sugerir fechá-lo antes.

#### Scenario: cache do debuginfod
- **WHEN** `~/.cache/debuginfod_client` tem 2,0 GB
- **THEN** a lista mostra "debuginfod_client — 2,0 GB" e, ao limpar só ele, as outras subpastas ficam intactas

#### Scenario: lixeira
- **WHEN** a lixeira tem 1,2 GB
- **THEN** limpar `trash` esvazia `files/` e `info/` e mostra 1,2 GB liberados

### Requirement: Nunca apagar dados pessoais
O sistema NÃO DEVE listar nem apagar nada fora das categorias acima. Em
especial, NÃO DEVE tocar em pastas pessoais (Documentos, Downloads,
Imagens…), em `~/.local/share` fora da lixeira e do Flatpak, nem em imagens de
contêiner ou de VM. Caminhos DEVEM ser resolvidos sem seguir links
simbólicos para fora da categoria.

#### Scenario: link simbólico no cache
- **WHEN** `~/.cache/app` é um link para `~/Documentos`
- **THEN** a limpeza remove o link, e `~/Documentos` fica intacto

### Requirement: Aviso de pouco espaço no diagnóstico
O teste `platform` DEVE produzir `storage.low-space` (atenção) quando a raiz
tem menos de 10% ou menos de 5 GiB livres, com o atalho para Liberar espaço.

#### Scenario: raiz quase cheia
- **WHEN** a raiz tem 3 GiB livres de 100 GiB
- **THEN** o relatório traz `storage.low-space`, e o Vega oferece "Abrir Liberar espaço"
