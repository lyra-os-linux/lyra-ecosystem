# Proposta: backup atrasado e atualização de firmware

## Por quê

São duas lacunas pequenas do diagnóstico, de alto valor para o usuário:

- **Backup atrasado.** O Vega tem a página Backup, mas nada avisa quando o
  último backup ficou velho. Quando o disco falha, a pergunta é sempre
  "quando foi o último?".
- **Firmware.** Hoje o diagnóstico só **conta** as atualizações de firmware
  (`platform.firmware-updates`) e manda o usuário para outro programa. O fwupd
  libera, sem senha, a atualização de firmware assinado em dispositivos
  confiáveis para a sessão ativa (`update-internal-trusted = yes`). O Vega pode
  atualizar ali mesmo.

## O que muda

1. O teste `platform` ganha **`backup.stale`** (atenção) quando nenhuma
   configuração de backup tem snapshot nos últimos 14 dias, e
   **`backup.none`** (informação) quando não há backup configurado. Os dois
   têm atalho para Backup.
2. **Atualizar firmware:** o achado `platform.firmware-updates` ganha o botão
   **Atualizar**, que o Vega executa **na sessão do usuário** com
   `fwupdmgr update`. O polkit do fwupd decide se precisa de senha. Depois, o
   Vega avisa quando é preciso reiniciar.

## Fora do escopo

- Fazer o backup a partir do diagnóstico: o atalho leva à página Backup, onde
  o "Fazer backup agora" já existe.
- Rebaixar a versão de firmware.

## Impacto

| Repositório | Mudança |
| --- | --- |
| `vegad` | O achado `backup.stale`/`backup.none` no `platform`, a partir dos snapshots do restic de cada configuração |
| `vega` | O atalho para Backup e o botão Atualizar firmware, executado na sessão |
| `lyra-vega-dbus` | Só a documentação dos códigos novos (aditivo) |
