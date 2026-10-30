# Beam em Tauri: protótipo de layout

Protótipo de layout e UX para trocar a interface `beam-gtk` (GTK4/libadwaita)
por Tauri 2, no padrão do Vega e do Lyra Downloads. Não substitui o produto e
não é um repositório da organização.

## Ver

```sh
python3 -m http.server -d ui 8778   # abra http://localhost:8778
```

No navegador, `ui/js/demo.js` simula o beam-core com os mesmos campos do
`Profile` (nome, host, porta, usuário, domínio, resolução, cor, tela cheia) e o
fluxo TOFU do `known_hosts`. Nada abre rede nem toca o chaveiro.

Para revisar uma tela direto, use `?open=`: `new`, `edit`, `first`
(certificado novo), `changed` (certificado alterado), `password` ou `certs`. A
sessão abre em `session.html`, e `session.html?state=connecting|connected|lost`
mostra cada estado. Ctrl+Shift+L simula queda da conexão. As páginas `debug*.html`
mostram erros na tela e desligam animações, para capturas headless.

## Telas e paridade com o GTK

| GTK atual | Protótipo |
| --- | --- |
| Lista de conexões com busca, Conectar e menu Editar/Duplicar/Excluir | Grade de cartões (ou lista) com miniatura colorida, endereço, resolução, cor e tela cheia; menu também pelo botão direito; Enter conecta, F2 edita, Del exclui |
| Diálogo de conexão (nome, servidor, porta, usuário, domínio, resolução com predefinições ou personalizada, 16/32 bits, tela cheia) | Folha em três seções; resolução escolhida por miniaturas proporcionais |
| Diálogos TOFU (primeira conexão, certificado alterado) | Impressão digital em blocos legíveis; no certificado alterado, a anterior e a atual lado a lado, com "Cancelar conexão" como ação principal |
| Senha com "Salvar no chaveiro" | Diálogo com mostrar/ocultar senha |
| Configurações → certificados confiáveis com remover | Página própria na barra lateral, com confirmação |
| Janela de sessão: Ctrl+Alt+Del, tela cheia, desconectar, banner de conexão perdida com Reconectar, Ctrl+Alt+F12 libera a captura | Barra mínima com status, aviso de captura, etapas da conexão, cartão de conexão perdida; em tela cheia a barra aparece ao levar o ponteiro ao topo |

## Fora do escopo do protótipo

Back-end Tauri, renderização dos quadros do IronRDP no canvas, captura real de
teclado/mouse, clipboard e i18n (en/es).
