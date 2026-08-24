# Lyra ecosystem

Catálogo organizacional dos produtos e componentes do Lyra. Este repositório
documenta propriedade, dependências de release e contratos transversais; ele
não participa do build das imagens e não deve se tornar uma dependência de
runtime.

## Fontes de verdade

- [`products.toml`](products.toml): inventário legível por ferramentas;
- [`docs/architecture.md`](docs/architecture.md): limites entre edições,
  produtos, componentes e empacotamentos;
- [`docs/integration-release.md`](docs/integration-release.md): fluxo entre
  Git, OBS e imagens;
- [`docs/adr-policy.md`](docs/adr-policy.md): propriedade e migração de ADRs;
- [`contracts.toml`](contracts.toml): valores que precisam permanecer
  coerentes entre mais de um repositório.

O catálogo descreve os repositórios, mas cada repositório continua sendo a
fonte canônica de seu código, comandos de teste e ciclo de release.

## Validação

Execute sem acesso à rede:

```bash
python3 scripts/validate.py
```

A validação confere o schema do catálogo, repositórios locais, documentos
canônicos, contratos compartilhados e consistência da chave pública de
release. Ela não compila produtos nem modifica o OBS.
