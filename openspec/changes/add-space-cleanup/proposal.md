# Proposta: Liberar espaço no Vega

## Por quê

Disco cheio é um dos problemas mais comuns de quem usa o computador no dia a
dia, e o Linux espalha o que pode ser apagado por lugares que o usuário não
conhece: core dumps, journal, cache do zypper, runtimes Flatpak sem uso,
kernels antigos, a lixeira, `~/.cache`. O YaST não tinha nada parecido.

Na workstation de referência, em 29/10/2026, havia:
- 4,2 GB em `~/.cache`: 2,0 GB de símbolos de depuração baixados pelo
  `debuginfod`, 1,1 GB do Firefox e 905 MB do build do Go;
- 30 core dumps, depois de 265 MB já apagados à mão no mesmo dia.

Nada disso aparece em lugar nenhum para o usuário.

O diagnóstico e o Resolver (vega#165) mostraram o modelo: o usuário vê o que
está acontecendo, em linguagem dele, e age com um clique seguro.

## O que muda

1. **Liberar espaço**, uma seção nova na página Armazenamento. Ela lista cada
   categoria com o tamanho e o que acontece ao limpar, e oferece o botão
   **Limpar** por item ou **Limpar tudo o que for seguro**.
2. **Categorias do sistema**, limpas pelo vegad: core dumps, journal (até um
   limite), cache de pacotes do zypper, runtimes Flatpak sem uso da instalação
   do sistema, kernels antigos (pelo `purge-kernels` do openSUSE) e a limpeza
   automática do Snapper, que respeita a política de retenção configurada.
3. **Categorias do usuário**, limpas pelo próprio Vega na sessão, sem senha:
   lixeira, miniaturas, `~/.cache` por aplicativo e runtimes Flatpak sem uso
   do usuário.
4. **Aviso no diagnóstico:** o teste `platform` passa a apontar a raiz com
   pouco espaço livre (`storage.low-space`), com atalho para Liberar espaço.

## Fora do escopo

- Arquivos pessoais: Documentos, Downloads e afins nunca são listados nem
  apagados. Um "o que ocupa espaço na minha pasta" (estilo Baobab) fica para
  outra proposta.
- Imagens de contêiner (Docker/Podman) e de VMs: só orientação, porque apagá-las
  pode destruir trabalho.
- Apagar snapshots além da política do Snapper. A página Snapshots continua
  sendo o lugar para isso.
- Limpeza agendada ou automática, que entra na proposta de verificação
  periódica.

## Impacto

| Repositório | Mudança |
| --- | --- |
| `lyra-vega-dbus` | Interface `org.lyraos.Vega1.Cleanup` (`Scan`, `Clean` e sinais), capability `space-cleanup-v1`; achado `storage.low-space` no diagnóstico |
| `vegad` | Medição e limpeza das categorias do sistema; achado de espaço baixo no `platform` |
| `vega` | Seção Liberar espaço em Armazenamento; categorias do usuário na sessão; atalho a partir do diagnóstico |

Nenhuma interface existente muda.

## Questões abertas

1. **Limite do journal:** 500 MB ou 2 semanas? A proposta usa **500 MB**,
   mantendo pelo menos o boot atual e o anterior.
2. **Kernels:** o `purge-kernels` do openSUSE mantém o kernel em uso, o mais
   novo e o anterior, conforme `multiversion.kernels` no `zypp.conf`. A
   proposta segue essa configuração em vez de inventar outra.
