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

O catálogo inclui os 26 repositórios, com GNOME prioritário e KDE/XFCE em
segundo plano. O campo `release_manifest` de cada edição determina os contratos
validados e todos os repositórios do catálogo são obtidos no CI.

O catálogo descreve os repositórios, mas cada repositório continua sendo a
fonte canônica de seu código, comandos de teste e ciclo de release.

## Validação

Execute sem acesso à rede:

```bash
python3 scripts/validate.py
```

A validação confere o schema do catálogo, repositórios locais, documentos
canônicos, owners, reciprocidade e ausência de ciclos nas dependências,
componentes distribuídos, contratos compartilhados e consistência da chave
pública de release. Ela não compila produtos nem modifica o OBS. Em pushes
para `main` e pull requests, o workflow também executa a suíte `unittest`.

## Gate integrado em VM

Uma candidata já inicializada e acessível por SSH pode ser verificada sem
instalar, remover pacotes ou aplicar reparos. O gate confere identidade, Zypper, serviços, D-Bus,
Polkit, SELinux/vegad e os contratos específicos de armazenamento e runtime:

```bash
python3 scripts/vm-integration-gate.py \
  --target root@ENDERECO_DA_VM \
  --edition desktop \
  --version 1.1-alpha.7 \
  --output evidence/desktop-1.1-alpha.7-vm.json
```

`--version` identifica o artefato exato (`LYRA_ARTIFACT_VERSION`), incluindo
estágio, iteração e eventual rebuild, como `1.1-beta.1.1` no Server.

A checagem de dependências usa
`zypper --xmlout --non-interactive --no-refresh verify --dry-run --details`
e exige um resumo XML sem propostas de reparo.
Saída zero sozinha não aprova a candidata. Consultas D-Bus não ativam serviços.
Falhas, timeout, saída excessiva ou XML inválido reprovam o diagnóstico; logs e
caches normais das ferramentas podem ser escritos. Veja a
[qualificação do gate somente leitura](docs/readonly-gate-qualification.md).

O resultado é um JSON fail-closed. A promoção exige todos os checks verdes;
no período de transição do domínio `vegad_t`, qualquer AVC do vegad bloqueia a
mudança da política para enforcing.

Antes do build, registre os commits e a presença de mudanças locais em todos
os repositórios, sem copiar nomes ou conteúdo dos arquivos alterados:

```bash
python3 scripts/workspace-manifest.py --output evidence/workspace-state.json
```

Uma candidata publicável exige `dirty: false` em todas as entradas; durante o
desenvolvimento, o manifesto ainda permite reproduzir quais commits serviram
de base para a combinação local.
