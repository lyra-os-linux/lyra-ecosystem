# Proposta: boot lento

## Por quê

"Meu computador demora para ligar" é uma queixa frequente, e a causa costuma
ser um serviço esperando a rede, um disco que não existe mais no `fstab` ou
algo instalado e esquecido. O `systemd-analyze` mostra tudo isso, mas em
termos de systemd. O Vega pode traduzir: quanto tempo o boot leva, o que
atrasa e o que dá para fazer.

## O que muda

- Um teste novo, `boot`, no diagnóstico. Ele lê o último boot:
  - tempo total por fase (firmware, carregador, kernel, initrd, sistema);
  - a cadeia crítica até o login gráfico;
  - os serviços que mais atrasaram.
- Achados com orientação:
  - `boot.slow` (atenção acima de 60 s no sistema);
  - `boot.wait-online` (o `NetworkManager-wait-online` segura o boot);
  - `boot.missing-device` (o `fstab` espera um disco que não existe);
  - `boot.slow-service` (um serviço acima de 10 s).
- Remédios seguros:
  - `disable-wait-online`, quando nada habilitado depende dele;
  - `disable-service`, só para serviços que o usuário habilitou e que não
    fazem parte da imagem Lyra (os da imagem só recebem orientação).

## Fora do escopo

- Editar o `fstab`: o achado do disco ausente traz orientação e atalho para
  Armazenamento.
- Otimizar o initrd ou o firmware.

## Impacto

| Repositório | Mudança |
| --- | --- |
| `lyra-vega-dbus` | O teste `boot` e os remédios `disable-wait-online` e `disable-service` (capability `diagnostics-v5`) |
| `vegad` | O parse de `systemd-analyze` (`time`, `blame`, `critical-chain`) e os remédios |
| `vega` | A linha do teste, o gráfico simples das fases e as orientações |
