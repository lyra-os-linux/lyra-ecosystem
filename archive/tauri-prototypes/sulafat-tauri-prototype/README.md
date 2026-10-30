# Sulafat em Tauri: protótipo de layout

Protótipo de layout e UX para trocar a interface `sulafat-gtk`
(GTK4/libadwaita/VTE) por Tauri 2, no padrão do Vega, do Lyra Downloads e do
Beam. Não substitui o produto e não é um repositório da organização.

## Ver

```sh
python3 -m http.server -d ui 8779   # abra http://localhost:8779
```

No navegador, `ui/js/demo.js` simula o sulafat-core: hosts do `~/.ssh/config`
(`SshHost`: alias, HostName, User, Port, IdentityFile, ProxyJump, diretivas
extras, somente leitura) e os metadados do Sulafat (grupo, cor, notas). O
terminal é simulado: aceita digitação, e `exit` ou Ctrl+D encerram a sessão.

Para revisar uma tela direto, use `?open=`: `sessions`, `ended`, `edit`, `new`,
`quick`, `settings`, `menu`, `hostmenu` ou `error` (configuração ilegível). A
página `debug.html` mostra erros na tela e desliga animações.

## Telas e paridade com o GTK

| GTK atual | Protótipo |
| --- | --- |
| Barra lateral de hosts com busca e farol de conexão | Hosts agrupados (grupos recolhíveis), faixa com a cor do host, farol verde quando há sessão, "somente leitura" para curingas e `Include`s; notas no tooltip |
| Menu do host: conectar/desconectar, editar, duplicar, abrir arquivos (sftp://), excluir | Mesmo menu, também pelo botão direito; Enter conecta, F2 edita, Del exclui |
| Sessões em abas (AdwTabView) com ponto de cor | Abas no próprio cabeçalho, ponto com a cor do host (vazado quando a sessão terminou), clique do meio fecha |
| Sobreposição "Sessão encerrada" com Reconectar/Fechar | Cartão no rodapé do terminal com o código de saída do ssh |
| Conexão rápida `user@host[:port]` | Botão ⚡ na barra lateral e nas abas, Ctrl+L, e direto no estado vazio |
| Diálogo de host (Conexão, Organização, Opções avançadas) | Folha com as três seções, cor por amostras ou livre, "Novo grupo…" e prévia do comando `ssh` |
| Configurações: fonte e linhas de histórico | Folha de configurações |
| Restaurar o backup mais recente; modo somente leitura quando o arquivo não carrega | Menu principal e banner na barra lateral |
| Sair da sessão, Reiniciar, Desligar (login1) | Seção no menu principal, com confirmação |
| Confirmar ao fechar aba ou janela com sessão ativa | Mesmas confirmações |

## Fora do escopo do protótipo

Back-end Tauri e o terminal real: no produto, xterm.js ligado a um PTY no Rust
rodando o `ssh` do OpenSSH, no lugar do VTE. i18n (en/es) também fica para a
implementação.
