# Especificações (OpenSpec)

Piloto de desenvolvimento guiado por especificação, aprovado em 29/10/2026.
O layout segue o [OpenSpec](https://github.com/Fission-AI/OpenSpec) (MIT):

- `specs/`: o comportamento vigente, por capacidade.
- `changes/<id>/`: uma proposta de mudança, com `proposal.md` (por quê e o
  quê), `design.md` (como), `tasks.md` (checklist) e `specs/` (o delta dos
  requisitos, em `## ADDED|MODIFIED|REMOVED Requirements`).
- `changes/archive/<data>-<id>/`: mudanças concluídas.

## Convenções do Lyra

- Texto em português. Termos normativos da RFC 2119 em maiúsculas: **DEVE**
  (SHALL/MUST), **NÃO DEVE** (MUST NOT), **DEVERIA** (SHOULD) e **PODE** (MAY).
- Requisitos no padrão EARS:
  - ubíquo: "O sistema DEVE …";
  - por evento: "QUANDO …, o sistema DEVE …";
  - por estado: "ENQUANTO …, …";
  - indesejado: "SE …, ENTÃO o sistema DEVE …";
  - opcional: "ONDE …, …".
- Cada requisito tem ao menos um cenário `#### Scenario:` com **WHEN**/**THEN**
  verificável por teste.
- Uma mudança que atravessa repositórios mora aqui, no `lyra-ecosystem`. As
  tarefas apontam o repositório de cada passo, na ordem contrato → vegad →
  frontends, a mesma do `contracts.toml`.
- A CLI do OpenSpec ainda não é usada. Antes de adotá-la, desligar a
  telemetria (`OPENSPEC_TELEMETRY=0`) e conferir se `validate` aceita os termos
  em português.
