# Gate de dependências sem reparo — auditoria #7

O gate antigo executava `zypper --non-interactive verify`. Isso podia instalar
ou remover pacotes, reparar a imagem candidata e aprová-la depois do reparo.
O comando agora é fixo:

```text
/usr/bin/timeout --kill-after=5s 110s /usr/bin/zypper --xmlout --non-interactive --no-refresh verify --dry-run --details
```

O código zero sozinho não confirma saúde: uma simulação pode retornar zero e
propor instalar dependências. O gate exige exatamente um `install-summary`
diretamente em `stream`, vazio e com cinco contadores/tamanhos zerados. Propostas,
prompts, mensagens de erro, XML incompleto/ambíguo ou resultado não zero reprovam
a candidata. Não existe fallback mutável ou tentativa automática de reparo.
O parser recusa DTD, instruções de processamento e CDATA; limita profundidade 32
e documento 1 MiB. Usa Expat da biblioteca padrão, sem nova dependência de runtime.

O transporte lê no máximo 1 MiB antes de encerrar a captura, mantém o documento
inteiro para validação e só então limita o diagnóstico do JSON a 4000 caracteres.
Assim um erro no início do XML não desaparece pela retenção do final da saída.
Há prazo remoto de 110s/KILL5s para zypper e prazo de 120s para SSH; falha de transporte,
UTF-8 inválido, excesso de saída ou timeout produzem reprovação registrada.

## Revisão das demais checagens

- Identidade e armazenamento: grep/test/findmnt apenas consultam dados.
- systemd: consulta unidades falhadas, configuração de unit e estado ativo.
- D-Bus: introspecção usa `--auto-start=no`, inclusive na checagem do domínio
  SELinux, para não ativar o serviço que deveria estar sendo inspecionado.
- Polkit/SELinux: pkaction, getenforce, semodule -l, matchpathcon sem -V/-F,
  ps/pgrep e ausearch consultam ações, política, contexto esperado e auditoria;
  não instalam políticas, relabelam arquivos ou alternam enforcing.
- Snapper lista snapshots; welcome consulta executável e dependências.

Nenhuma checagem autoriza instalação/remoção, refresh de repositórios ou reparo
do estado medido. Logs e caches normais das ferramentas não são uma promessa de
zero escrita física. Correções exigem ação externa e uma nova candidata.

## Qualificação nativa de 10/09/2026

```sh
python3 -m unittest discover -s tests -p test_vm_integration_gate.py -v
git show 6b275ba:scripts/vm-integration-gate.py > /tmp/lyra-baseline-gate.py
python3 scripts/check-readonly-gate-vm.py \
  --kernel /boot/vmlinuz-6.12.0-160100.4-default \
  --baseline-gate /tmp/lyra-baseline-gate.py \
  --log /tmp/lyra-readonly-gate-vm.log
```

O harness constrói dois RPMs sem scriptlets e os instala exclusivamente em VM
QEMU/systemd descartável, sem NIC, discos ou contas do host. RPM, zypper, solver,
comando do gate e parser são reais. O repositório fictício local tem GPG
desabilitado somente na VM. O helper de VM deriva do ensaio do updater #12
(commit 0bd0997); não depende de checkout externo para executar.

O baseline 6b275ba instalou o provedor ausente e retornou `passed`. O candidato
passou o sistema saudável e reprovou tanto o provedor instalável quanto o ausente
com proposta de remoção/cancelamento. Os três casos executaram os caminhos
Desktop e Server, preservando byte a byte o rpmdb (exceto lock), payloads dos
RPMs, inventário e arquivo do repositório. O transporte SSH é testado por contrato;
a VM chama o runner local equivalente. Demais checagens do produto são fixtures
nesse ensaio: isso não qualifica uma ISO, SELinux completo, sessão gráfica ou SSH
fim a fim. Nenhum zypper verify/gate foi executado contra o host.

Os oito testes do gate cobrem argumentos exatos, XML real saudável/instalação/
remoção, propostas com retorno zero, contadores, truncamento, DTD, ambiguidades,
limites e timeout. Há job CI próprio para executar esses testes mesmo quando
contratos de outros repositórios divergem; o job geral continua obrigatório e
não tem falhas suprimidas.

## Contratos reconciliados — item #6

As divergências observadas no baseline foram tratadas na mesma PR: o contrato
canônico agora acompanha o produto 1.1/Leap 16.1 já adotado pelas quatro edições.
O catálogo inclui os 26 repositórios e declara os manifestos de cada edição;
o CI obtém todos eles. GNOME continua prioritário e KDE/XFCE secundários.
O site é validado pelo JSON-LD SoftwareApplication (versão/arquitetura), sem
impor frases traduzidas ou textos retirados no redesenho. A data planejada e
o suporte comunitário permanecem no contrato; isso não afirma que o site
publique essas políticas nem altera a data planejada.

A CLI aceita versões MAJOR.MINOR[.PATCH] e sufixos de estágio/iteração/rebuild,
e compara LYRA_ARTIFACT_VERSION para distinguir candidatas do mesmo produto.
Testes executam esse diagnóstico sobre as identidades geradas das edições e
recusam versões divergentes. A qualificação nativa acima cobre o comando de
dependências e seu parser, que permanecem inalterados nesta reconciliação.
