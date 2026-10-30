# Design: boot lento

- **vegad,** `internal/diagnostics/boot.go`:
  - `systemd-analyze time` e `systemd-analyze blame --no-pager`;
  - `systemd-analyze critical-chain graphical.target --no-pager`;
  - `journalctl -b -u '*.device' -g 'timed out'` para os discos ausentes;
  - presets com `systemctl preset --dry-run <unit>`, ou lendo
    `/usr/lib/systemd/system-preset/*.preset`.
- O teste é somente leitura e leva menos de 5 s. Os remédios usam
  `systemctl disable`, com a lista do que foi desfeito no resumo.
- **Vega:** uma barra horizontal com as fases e a lista dos serviços mais
  lentos, sem biblioteca de gráficos.
