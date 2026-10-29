# Design: verificação periódica

- **vegad:**
  - O timer `vegad-health-check.timer` (`OnCalendar=weekly`,
    `Persistent=true`, `RandomizedDelaySec=1h`) dispara um serviço que chama o
    `Diagnostics.Start` interno com os testes leves e a origem `periodic`.
  - O estado fica em `/var/lib/vega/diagnostics/periodic.json`: o jobId
    anterior, os códigos vistos, a data em que cada um apareceu e o histórico
    de `percentUsed`.
  - No fim, a comparação emite o sinal `Diagnostics.Novelties(jobId, count)`.
- **Vega:** o notificador da sessão (o autostart que já existe para as
  atualizações) escuta o `Novelties` e chama `LastPeriodic()` quando a sessão
  começa, para avisar o que aconteceu enquanto o usuário estava fora. A
  notificação usa o `Gio.Notification` com a ação de abrir o Vega.
- **Server:** o mesmo timer, sem notificação gráfica. O `vega-cli` mostra
  "novidades desde a última verificação" no login via SSH.
- **Descartado:** rodar os testes pesados no timer. Eles são caros, esquentam o
  notebook e não mudam de semana para semana.
