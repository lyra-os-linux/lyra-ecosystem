# Política de segurança

## Versões com correções

| Versão | Situação |
| --- | --- |
| Lyra OS 16.1 (Desktop e Server) | recebe correções de segurança |
| Candidatas (RC) da 16.1 | recebem as mesmas correções por atualização |
| Alphas, Betas e a linha 1.x | não recebem mais correções; instale a 16.1 |

As correções do Lyra saem como pacotes atualizados no OBS e chegam pelo
`zypper` e pelo Vega, sem precisar reinstalar. As correções da base openSUSE
Leap 16.1 chegam pelos repositórios do openSUSE.

## Como reportar uma vulnerabilidade

**Não abra uma issue pública, discussão ou PR descrevendo a falha.**

Use o relato privado do GitHub no repositório afetado: aba **Security →
Report a vulnerability** (por exemplo, no
[vegad](https://github.com/lyra-os-linux/vegad/security/advisories/new)). Se não
souber qual é o repositório, use o
[lyraos-desktop](https://github.com/lyra-os-linux/lyraos-desktop/security/advisories/new).

Inclua, se puder:

- a versão do Lyra OS (`cat /etc/os-release`) e dos pacotes envolvidos
  (`rpm -q vegad vega-gtk vega-web vega-cli`);
- os passos para reproduzir e o impacto (o que um atacante consegue fazer);
- se a falha é do Lyra ou de um pacote do openSUSE.

## O que esperar

- Confirmação do recebimento assim que o mantenedor ler o relato.
- Uma avaliação da gravidade e um plano de correção, combinados com você no
  próprio relato privado.
- A correção publicada por atualização e, depois dela, o aviso público com o
  crédito a quem reportou, se você quiser.

Falhas de pacotes do openSUSE são encaminhadas ao
[time de segurança do openSUSE](https://en.opensuse.org/openSUSE:Security_team).
