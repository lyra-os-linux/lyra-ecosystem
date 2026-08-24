# Política de ADRs

Uma decisão vive no menor escopo que possui autoridade para implementá-la:

- decisão interna de aplicação: repositório da aplicação;
- composição, instalador ou política de imagem: repositório da edição;
- decisão exclusiva do Server: repositório do Server;
- contrato entre vários produtos sem proprietário natural: este repositório.

Toda ADR deve declarar estado, data, proprietário e escopo. Quando houver
migração, o documento canônico acompanha o código e o caminho antigo vira um
stub com a data da migração e link para o novo local. O stub não recebe novas
decisões.

Decisões transversais não devem ser copiadas integralmente. O catálogo registra
o contrato comum e cada produto documenta somente sua implementação e suas
exceções justificadas.
