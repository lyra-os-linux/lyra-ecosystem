# Combinados de trabalho com o assistente (Claude Code)

Estes combinados viviam na memória local do assistente e foram salvos aqui em
30/10/2026, antes da formatação da máquina de build. Depois de reinstalar,
restaure o `CLAUDE.md` do workspace (`workspace-CLAUDE.md`, nesta pasta, vai em
`~/Git/LyraOs/CLAUDE.md`) e peça ao assistente para ler este arquivo e o ponto de
retomada (lyra-ecosystem#45).

## Comunicação

- **Sempre em português do Brasil**, inclusive relatórios e perguntas.
- **Respostas curtas e objetivas:** a conclusão ou a próxima ação primeiro, sem
  contexto não pedido; uma pergunta por vez; um item por vez, terminado antes
  do próximo.
- **O cronograma é do mantenedor.** Não levantar datas, congelamento ou
  lançamento por conta própria; mencionar só se houver conflito real.

## Plano antes de código

- **Nunca programar livre:** antes de uma frente nova, escrever ou estender o
  plano, obter aprovação e só então executar.
- **Specs (OpenSpec) são validadas antes de qualquer commit:** escrever
  localmente, mostrar um resumo, publicar só depois de "aprovado".
- Um achado no meio do fluxo é classificado contra o plano: bloqueador (P0/P1)
  pede mudança explícita de plano; o resto vira issue conhecida para o próximo
  ponto planejado. Nunca iniciar um rebuild de ISO não planejado.

## Merge, release e publicação

- **Merge só quando o mantenedor pedir.** Terminar o trabalho e abrir os PRs; o
  merge espera a ordem ("espera eu pedir o merge").
- **Um merge só por lote:** correções relacionadas vão juntas num mesmo ciclo
  de merge e release (cada release custa staging, check, SR e instalação).
- **Autonomia no fluxo combinado:** com o plano aprovado, seguir de ponta a
  ponta (CI verde, tag, staging no OBS, SR, aceite) sem pedir a cada passo.
  Parar para: material secreto (chave de release), publicação pública (upload
  de ISO, site), mudanças de escopo ou decisão.
- **Site:** sempre servir a prévia local e esperar o OK antes do merge, mesmo
  quando a publicação já foi pedida.
- **Upload no SourceForge sem download de verificação.**
- **Staging e release iguais**, sem divergência longa; **versões com uma fonte
  só** (nada de rótulo de RC errado no instalador).

## Produto

- **Distro pequena, feita com carinho:** processo leve e proporcional; não
  comparar com as distros grandes nem propor cerimônia de empresa.
- **Ferramentas úteis:** todo achado mostrado ao usuário precisa de um próximo
  passo claro (conserto seguro, atalho para a página certa ou orientação
  simples); linguagem simples, dados brutos recolhidos.
- **Vega é a estrela do sistema:** nasceu para ocupar o lugar do YaST, que saiu
  do Leap 16. Pensar "o que o YaST fazia e como fazer melhor e mais seguro". O
  Vega continua evoluindo por atualização depois do lançamento, desacoplado do
  calendário da ISO.
- Sem pressão de calendário: uma versão sai quando o mantenedor acha que está
  pronta. O Vega em Tauri é melhoria, não risco. Testes na estação física são
  permitidos, além das VMs. O mantenedor vai delegar grupos de repositórios a
  outras pessoas.
