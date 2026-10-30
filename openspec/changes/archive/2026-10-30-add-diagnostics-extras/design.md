# Design: backup e firmware

- **Backup (vegad):** o `platform` lê as configurações em
  `readBackupConfig` e chama o `resticSnapshots` de cada uma, com prazo de
  10 s por configuração. O destino desconectado (`errBackupDeferred`) usa o
  estado da última execução bem-sucedida, gravado pelo `RunBackupJob`.
- **Firmware (Vega):** é o mesmo padrão da atualização Flatpak na sessão
  (`flatpak_update.rs`). O `fwupd_update.rs` roda `fwupdmgr update
  --no-reboot-check -y` e emite `software-transaction`, que dá a mesma tarefa
  e o mesmo console. O pedido de reinício vem da saída do fwupd.
