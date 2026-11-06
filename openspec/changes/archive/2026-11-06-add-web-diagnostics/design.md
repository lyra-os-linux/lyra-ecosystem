# Design: diagnóstico no `vega-web`

## Autorização (o ponto central)

O painel HTTPS roda como a conta `vega-web`, que o polkit **sempre nega**
(regras do `vegad` e do `vega-web`). Tudo o que não é público passa pelo
broker administrativo: senha PAM do usuário de `wheel`, concessão de uso
único e um worker com o UID real do usuário, que abre a própria conexão D-Bus.
Para esse worker (membro de `wheel`, fora de sessão local), a regra
`50-vegad-remote-admin` já decide:

| Chamada | Classe no vegad | Ação polkit | Pelo worker |
| --- | --- | --- | --- |
| `ListTests`, `Current`, `Remedies`, `GetPeriodic` | `brokeredPublic` | — | não precisa: o HTTPS chama direto |
| `Start` só com `network` | administrativa | `network.diagnose` | `YES` em silêncio |
| `Start` com outros testes | administrativa | `hardware.diagnose` | `AUTH_SELF` |
| `Report` só da rede | administrativa | `network.diagnose` | `YES` |
| `Report` com outros testes | administrativa | `logs.read-admin` | `AUTH_SELF_KEEP` |
| `RepairFindings`, `Repair` | administrativa | `hardware.repair` | `AUTH_SELF` |
| `MarkLogsSeen`, `SetPeriodic` | administrativa | `hardware.diagnose` | `AUTH_SELF` |
| `LastPeriodic` | `privilegedRead` | `hardware.read-admin` | `YES` |
| `Cleanup.Scan` | `privilegedRead` | `storage.read-admin` | `YES` |
| `Cleanup.Clean` | administrativa | `storage.cleanup` | `AUTH_SELF` |

Por isso o vegad não muda. A qualificação em VM (`check-admin-helper-vm.py`)
confirma cada linha; se alguma falhar, a correção vai para o vegad antes do
build da RC 3.

**Senha (decisão 3):** o painel continua pedindo a senha em cada ação, como
já faz na instalação de RPM, no firewall e nas leituras de boot e journal.
Como o worker vive só até 60 segundos e não guarda autorização entre ações, o
`AUTH_SELF_KEEP` não ajuda de uma ação para outra. Para não pedir a senha
duas vezes no que é curto, o broker ganha uma operação composta:

- **Teste de rede:** `Start(["network"])`, espera pelo `Current` (até 45
  segundos) e `Report`, numa só operação. Uma senha devolve o relatório.

O diagnóstico completo demora minutos, então fica em dois passos: senha para
iniciar e senha para ler o relatório (o `vega-cli` também pede a segunda pelo
SSH). O relatório lido fica na sessão por alguns minutos, como as leituras
administrativas de hoje, e Corrigir, Já vi e Pedir ajuda o reusam.

## Operações novas no broker

`Operation` (em `admin_ipc.rs`) ganha variantes com campos fixos, sem texto
livre do lado privilegiado:

- `DiagnosticsStart(tests)`: só ids conhecidos (`[a-z-]`, até 16 testes,
  checados contra `ListTests`), e o locale do painel;
- `DiagnosticsReport { job, redact }`: devolve o JSON;
- `NetworkCheck`: a operação composta acima;
- `RepairFindings { job, findings }`: pares (etapa, código) da lista de
  `Remedies`, até 32;
- `MarkLogsSeen(job)`, `SetPeriodic { enabled, frequency }` (`weekly` ou
  `daily`);
- `ReadQuery::LastPeriodic` e `ReadQuery::CleanupScan`: leituras novas, no
  mesmo molde de `KernelBoot` e `Firewall`;
- `CleanupClean(ids)`: só ids das categorias do sistema.

Cada variante mapeia uma única ação polkit, e o agente do broker continua
respondendo a um só desafio, dessa ação.

## Progresso

O HTTPS acompanha os jobs pela própria conexão D-Bus, como já faz com a
instalação da NVIDIA:

- **Diagnóstico e Corrigir:** `Current` a cada segundo (é `brokeredPublic`),
  mais os sinais `Progress`/`Finished` quando chegarem. O job pode terminar
  antes da resposta do `Start` (o mesmo caso corrigido no Vega em 30/10), e o
  `Current` voltando a 0 encerra a espera.
- **Limpeza:** os sinais `CategoryFinished` e `Finished` do `Cleanup`.
- A página do job se atualiza sozinha enquanto roda; o fim mostra o
  resultado e o link para o relatório.

## Páginas

- `/hardware/diagnostico`: testes e último resultado, verificação periódica,
  executar, relatório, Corrigir, Já vi, Pedir ajuda.
- `/rede`: o botão Minha internet não funciona e o resultado passo a passo.
- `/armazenamento`: Liberar espaço (medir, escolher, confirmar, total).
- `/`: o cartão da verificação semanal.

O texto segue os do Vega e do `vega-cli`, em português como as demais
páginas do painel (só a página da NVIDIA é trilíngue), e o JSON do relatório
é renderizado no servidor, sem JavaScript novo. A orientação de cada achado é
gerada do `GUIDE` do Vega, com os links apontando para as páginas do painel.

O relatório `0` é o mais recente (`Diagnostics.Report`): "Ver o último
relatório" usa esse número e o painel guarda o resultado pelo `jobId` real.

## Pedir ajuda

Porta o `help-text.js` do Vega para Rust (`help_text.rs`), com o mesmo limite
de 6000 caracteres e o mesmo corte dos dados brutos. O texto vem de
`Report(job, redact=true)`. A página mostra o texto para copiar e os links
para as Discussions (Q&A) e para uma issue nova, preenchidos pela URL. O
ponto de ajuda é o mesmo do Vega, o repositório `lyraos-desktop`, para as
duas edições: o `lyraos-server` não tem Discussions.

## Testes

- Unitários: codificação das operações novas, validação dos ids, o texto de
  ajuda (os mesmos casos de `tests/test_help_text.py`).
- Integração HTTP com o barramento privado e o daemon simulado: CSRF,
  sessão, ids inválidos, operação composta.
- VM descartável (`check-admin-helper-vm.py`): continua cobrindo instalação e
  firewall. Ela só carrega a regra polkit do próprio `vega-web`, não a
  `50-vegad-remote-admin`, então as linhas novas da tabela foram qualificadas
  na VM do Server RC 3 (vegad 5.6.2, polkit e PAM reais), pelo navegador e por
  `curl`, em 30/10/2026.
- Gate da RC 3 do Server: o fluxo completo no navegador.
