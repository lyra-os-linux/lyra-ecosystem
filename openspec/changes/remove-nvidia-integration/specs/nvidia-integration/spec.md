# Integração NVIDIA no Vega

## REMOVED Requirements

### Requirement: Instalação opcional do driver NVIDIA oficial
**Motivo:** decisão do mantenedor de 31/10/2026; o Vega deixa de instalar,
diagnosticar e recuperar a pilha NVIDIA. **Migração:** `lyra-nvidia` de
transição e o procedimento oficial do openSUSE.

### Requirement: Ponto de recuperação NVIDIA
**Motivo:** sai junto com a instalação. **Migração:** pontos existentes são
restaurados manualmente com o `restic`, conforme a documentação do Server.

## ADDED Requirements

### Requirement: Métodos NVIDIA aposentados
O `vegad` DEVE responder `org.freedesktop.DBus.Error.NotSupported` a
`InstallNvidia`, `NvidiaStatus`, `NvidiaRecovery`, `CheckNvidia` e
`SwitchNvidiaDriver`, sem pedir autorização, sem iniciar worker de consulta e
sem alterar o sistema. `Metadata.Capabilities` NÃO DEVE conter
`nvidia-official-v1` nem `nvidia-recovery-v1`.

#### Scenario: frontend antigo pede a instalação
- **WHEN** um cliente chama `InstallNvidia(true)` num `vegad` novo
- **THEN** recebe `NotSupported`, o polkit não é consultado e nenhuma transação é criada

#### Scenario: capacidades
- **WHEN** um cliente lê `Metadata.Capabilities` nos perfis `desktop` e `server`
- **THEN** a lista não contém nenhuma capacidade `nvidia-*`

### Requirement: Frontends sem NVIDIA
O `vega-gtk`, o `vega-web` e o `vega-cli` NÃO DEVEM oferecer página, menu,
ação ou rota de instalação, diagnóstico ou recuperação NVIDIA, com qualquer
versão do `vegad`.

#### Scenario: `vega-web` com rota antiga
- **WHEN** o navegador abre `/hardware/nvidia`
- **THEN** o painel responde 404

#### Scenario: operação reservada no broker
- **WHEN** o broker recebe o código de operação `3`
- **THEN** recusa a operação sem chamar o D-Bus

#### Scenario: `vega-cli` com `vegad` antigo
- **WHEN** o `vegad` ainda anuncia `nvidia-official-v1`
- **THEN** o menu Hardware e Kernel não mostra NVIDIA

### Requirement: Atualização sem travar o Zypper
SE uma máquina tem o `lyra-nvidia` instalado pelo Vega, ENTÃO a atualização
para o `lyra-nvidia` de transição DEVE remover as exigências de versão sem
desinstalar o driver e sem mudar o boot.

#### Scenario: kernel novo depois da transição
- **WHEN** a VM com a pilha 615.71.09 recebe o `lyra-nvidia` de transição e depois uma atualização de kernel com outro KMP
- **THEN** o `zypper` atualiza sem conflito e o módulo NVIDIA carrega após reiniciar
