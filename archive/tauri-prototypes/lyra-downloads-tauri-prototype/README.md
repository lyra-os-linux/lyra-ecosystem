# Lyra Downloads em Tauri: protótipo de layout

Protótipo de layout e UX para trocar a interface `lyra-downloads-gtk`
(GTK4/libadwaita) por Tauri 2, seguindo o padrão criado no Vega
(`vega/vega-gtk/ui`). Não substitui o produto e não é um repositório da
organização, como o `vega-tauri-prototype/`.

## Ver

```sh
python3 -m http.server -d ui 8777   # abra http://localhost:8777
```

No navegador, `ui/js/demo.js` simula o serviço. A simulação usa os mesmos
nomes e formatos do IPC real (`crates/lyra-downloads-ipc`: `Op`, `Snapshot`,
`TaskView`), e nada toca a rede ou o disco.

Para revisar uma tela direto, use `?open=`: `new`, `multi`, `details`,
`prefs`, `palette`, `menu`, `row-menu`, `quit` ou `engine` (queda do motor).
Exemplo: `http://localhost:8777/?open=new#/active`. A página `debug.html`
mostra erros de JavaScript na tela e desliga as animações, para capturas
headless.

## Base visual

- `css/app.css`, `js/icons.js` e `js/ui.js` são cópias do Vega: tokens do
  libadwaita 1.7, claro e escuro, cor de destaque, janela com barra de título
  própria, listas, folhas, popovers, toasts e busca (Ctrl K).
- `css/downloads.css` e `js/main.js` têm só o que é do Downloads.

## Telas e paridade com o GTK

| GTK atual | Protótipo |
| --- | --- |
| Filtros Todos, Em andamento, Concluídos, Com erro | Barra lateral com contadores; "Em andamento" é a tela inicial, com seções Baixando, Na fila e Pausados |
| Linha da tarefa | Ícone pelo tipo de arquivo com o estado sobreposto, progresso, velocidade, tempo restante, conexões ativas/pedidas e selo do SHA-256 |
| Novo download (Ctrl+N), vários links, sondagem, pasta, nome, SHA-256, conexões, avisar | Folha com sondagem ao vivo (tamanho, retomável) e opções avançadas recolhidas; também abre ao colar (Ctrl+V) ou soltar um link na janela |
| Menu da linha: detalhes, novo link, mover na fila, conexões, remover, apagar arquivo | Mesmo menu, também pelo botão direito ou Shift+F10; reordenar a fila arrastando ou com Alt+PgUp/PgDn |
| Detalhes | Folha com endereço, arquivo, conexões, SHA-256 esperado e resultado, datas e GID do aria2 |
| Preferências | Pasta, conexões, downloads simultâneos, limite de velocidade, retomar sozinho, avisar e captura do Firefox, mais reiniciar o motor |
| Banner de motor parado | Banner com "Reiniciar motor"; tarefas pausadas pelo sistema mostram "retoma sozinho" |
| Pausar tudo e encerrar o serviço | Menu principal, com diálogo que explica que fechar a janela não para os downloads |

## Fora do escopo do protótipo

Back-end Tauri (`src-tauri`), seletor de pastas pelo portal, notificações do
sistema, i18n (en/es) e o desfazer de "Remover do histórico".
