# Organização do ecossistema

O Lyra usa repositórios independentes e integração por pacotes publicados. A
separação segue a unidade que possui ciclo de vida, risco e responsabilidade
próprios.

| Tipo | Responsabilidade | Exemplos |
| --- | --- | --- |
| Edição | Compor, instalar e validar uma imagem completa | Desktop, Server |
| Aplicação | Entregar uma capacidade visível com release próprio | Beam, Sulafat, Welcome |
| Componente | Implementar uma fronteira independente de um produto | vegad, Vega Web |
| Contrato compartilhado | Definir uma interface consumida por vários processos | lyra-vega-dbus |
| Branding | Identidade visual distribuída como pacote | lyraos-desktop-theme |
| Empacotamento de terceiro | Adaptar software upstream sem assumir autoria | LinuxToys, VS Code, Zed |

## Regras de dependência

- Edições consomem RPMs promovidos, não o estado arbitrário de outro checkout.
- O repositório de uma aplicação é a fonte canônica de seu código, testes e
  decisões internas.
- A edição é responsável pela composição, pelo baseline OBS fixado e pelo
  teste integrado da imagem.
- Contratos entre processos têm proprietário explícito e compatibilidade
  versionada.
- Este catálogo não contém código necessário para construir ou inicializar o
  sistema.

## Propriedade

`products.toml` registra as relações `consumes` e `consumed_by`. Uma mudança
incompatível precisa ser coordenada com todos os consumidores declarados antes
da promoção do pacote. A ausência de um checkout local não remove o produto do
catálogo; `local_path` descreve o layout recomendado da estação.
