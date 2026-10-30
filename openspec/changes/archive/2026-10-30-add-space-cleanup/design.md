# Design: Liberar espaço

## Contrato (`lyra-vega-dbus`)

- Interface nova `org.lyraos.Vega1.Cleanup`, capability `space-cleanup-v1`:
  - `Scan() -> a(stbs)`: id, bytes, pode limpar agora e detalhe. O detalhe
    traz a quantidade e o motivo de "não agora". Leitura intermediada
    silenciosa, como as `*.read-admin`.
  - `Clean(ids as) -> jobId u`, com os sinais `Progress(jobId, id, percent,
    message)` e `Finished(jobId, result, freedBytes t)`. Polkit
    `org.lyraos.vega.storage.cleanup` (`auth_admin_keep`).
- Diagnóstico: o código `storage.low-space` (aditivo, sem capability nova).

## vegad

- `internal/cleanup/`: uma função `measure` e uma `clean` por categoria.
  - Medir com `du` sem atravessar sistemas de arquivos (`-x`), e só dentro do
    caminho da categoria.
  - `flatpak-unused`: listar com `flatpak uninstall --unused --system` e
    responder "não" sem aplicar. Se essa versão do Flatpak não permitir listar
    sem remover, cair em `flatpak list --runtime` e comparar com as
    dependências dos apps instalados.
  - `old-kernels`: listar pela regra `multiversion.kernels` e pelo kernel em
    uso. A remoção usa `zypper purge-kernels` (ou o serviço `purge-kernels`)
    dentro de `withSnapshots`.
  - `snapshots`: `snapper cleanup --dry-run`, se existir; senão, listar pelo
    algoritmo e mostrar "tamanho desconhecido".
- `Clean` entra no coordenador de exclusividade, como um diagnóstico.

## Vega

- Armazenamento → **Liberar espaço**: a lista das categorias do sistema (do
  `Scan`) e do usuário (medidas no próprio Vega), o total recuperável, o
  botão Limpar por linha e "Limpar tudo o que for seguro".
  - "Seguro" quer dizer: `coredumps`, `journal`, `package-cache`,
    `flatpak-unused`, `thumbnails`, `user-flatpak-unused` e `trash`.
  - `old-kernels`, `snapshots` e `user-cache` pedem escolha explícita.
- As categorias do usuário rodam no backend Rust do Vega, sem polkit. Os
  caminhos são resolvidos com `openat`/`O_NOFOLLOW`, ou equivalente, para não
  seguir links.
- O diagnóstico ganha o atalho de `storage.low-space` para a seção nova.

## Alternativas descartadas

- **Limpar tudo pelo vegad:** o root apagando na pasta do usuário é um risco
  sem necessidade. A sessão já tem a permissão certa.
- **Usar o BleachBit:** é grande, tem regras demais e cobre outros sistemas.
  Uma lista curta e previsível serve melhor a uma distro pequena.

## Riscos

- `purge-kernels` com a configuração errada removeria o kernel de
  recuperação. Por isso ele segue a `multiversion.kernels` do sistema e roda
  dentro do snapshot.
- Apagar o cache de um aplicativo aberto pode causar erros nele, daí o aviso
  e a escolha explícita em `user-cache`.
