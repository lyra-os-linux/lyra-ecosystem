#!/usr/bin/env bash
# Promove o Lyra OS 16.1 de ponta a ponta: distro, site, releases e issues.
#
# Decisão do mantenedor em 02/11/2026: a RC 3 congelada vira a 16.1 estável em
# 03/11/2026, sem rebuild. Este script é o "botão" da promoção:
#
#   1. checagens: ferramentas, chave de release, acesso ao SourceForge, PR do
#      site pronto e repositório do Leap 16.1 no ar;
#   2. dry-run de scripts/promote-16.1.sh e uma única confirmação;
#   3. promote-16.1.sh --execute: tags v16.1 / server-v16.1 e publicação em
#      releases/16.1/stable/<edição>/ no SourceForge;
#   4. confere o checksum publicado em stable/;
#   5. merge do PR do site (branch release/16.1-estavel), espera o deploy do
#      GitHub Pages e confere https://lyraos.com.br;
#   6. GitHub Releases v16.1 e server-v16.1;
#   7. comenta e fecha lyraos-desktop#227 e lyraos-server#41.
#
# Pode ser executado de novo depois de uma falha: cada etapa pula o que já
# foi feito. Todo o terminal fica registrado em ~/lyra-promocao-16.1-*.log.
#
# Uso:
#   scripts/promover-lyra-os.sh            # pede confirmação antes de promover
#   scripts/promover-lyra-os.sh --check    # só as checagens e o dry-run

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
WORKSPACE="${LYRA_WORKSPACE:-$(dirname "$(dirname "$SCRIPT_DIR")")}"
PROMOTE="$SCRIPT_DIR/promote-16.1.sh"
ORG="lyra-os-linux"
SITE_BRANCH="release/16.1-estavel"
SITE_URL="https://lyraos.com.br"
SF_TARGET="rodrigobritosoa@frs.sourceforge.net"
SF_ROOT="/home/frs/project/lyra/releases/16.1"
SF_HOST_KEY='frs.sourceforge.net ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOQD35Ujalhh+JJkPvMckDlhu4dS7WH6NsOJ15iGCJLC'
SF_DOWNLOAD="https://downloads.sourceforge.net/project/lyra/releases/16.1"
LEAP_REPO="https://download.opensuse.org/distribution/leap/16.1/repo/oss/repodata/repomd.xml"
RELEASE_KEY="01B63EEDBE6B079126A0116EFA7353A131ECEFEB"

declare -A REPO=([desktop]=lyraos-desktop [server]=lyraos-server)
declare -A TAG=([desktop]=v16.1 [server]=server-v16.1)
declare -A ISSUE=([desktop]=227 [server]=41)
declare -A TITLE=([desktop]="Lyra OS 16.1 “Odisseia”" [server]="Lyra OS Server 16.1 “Delos”")
declare -A PREFIX=([desktop]=LyraOS-Desktop-16.1-rc.3-x86_64 [server]=LyraOS-Server-16.1-rc.3-x86_64)
declare -A SHA256=(
  [desktop]=50211bcf31271d232ea4326fc46704cad79a729d1bb363679ce32829d7794a3a
  [server]=1bcb55a7842487ee463bf40640b882f34dd00e1a9a1a31d539a8de39919b7a45
)
declare -A NOTES=(
  [desktop]="https://github.com/$ORG/lyraos-desktop/blob/main/docs/releases/lyra-os-desktop-16.1-rc.3.md"
  [server]="https://github.com/$ORG/lyraos-server/blob/main/docs/releases/lyra-os-server-16.1-rc.3.md"
)

CHECK_ONLY=0
case "${1:-}" in
  --check) CHECK_ONLY=1 ;;
  "") ;;
  -h|--help) sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) echo "ERRO: opção desconhecida: $1" >&2; exit 2 ;;
esac

LOG="$HOME/lyra-promocao-16.1-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

finish() {
  local status=$?
  rm -f -- "${KNOWN_HOSTS:-}"
  echo
  if [ "$status" -eq 0 ]; then echo "Registro completo em $LOG"
  else echo "PAROU com erro (código $status). Corrija e rode de novo; o registro está em $LOG"; fi
  # Aberto por um atalho, o terminal fecharia antes de dar para ler o resultado.
  if [ -t 0 ]; then read -rp "Pressione Enter para fechar. " _ || true; fi
}
trap finish EXIT

step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok() { printf '\033[32mOK\033[0m %s\n' "$*"; }
fail() { printf '\033[31mERRO\033[0m %s\n' "$*" >&2; exit 1; }

KNOWN_HOSTS="$(mktemp)"
printf '%s\n' "$SF_HOST_KEY" >"$KNOWN_HOSTS"
SSH_OPTS=(-o UserKnownHostsFile="$KNOWN_HOSTS" -o StrictHostKeyChecking=yes -o BatchMode=no)
sf_sftp() { sftp "${SSH_OPTS[@]}" -b - "$SF_TARGET" >/dev/null; }

site_pr() {
  gh pr list -R "$ORG/site" --head "$SITE_BRANCH" --state all --json number,state \
    --jq 'map(select(.state != "CLOSED")) | .[0] | "\(.number) \(.state)"'
}

# ---------------------------------------------------------------- 1. checagens
step "1/7 Checagens"
for tool in git gh gpg curl rsync ssh sftp sha256sum; do
  command -v "$tool" >/dev/null || fail "ferramenta ausente: $tool (sudo zypper install $tool)"
done
ok "ferramentas"
gh auth status >/dev/null 2>&1 || fail "gh não está autenticado (gh auth login)"
ok "gh autenticado"
if ! gpg --list-keys "$RELEASE_KEY" >/dev/null 2>&1; then
  gpg --batch --import "$WORKSPACE/lyraos-desktop/docs/release-signing-key.asc"
fi
gpg --list-keys "$RELEASE_KEY" >/dev/null 2>&1 || fail "chave pública de release $RELEASE_KEY ausente"
ok "chave pública de release"
printf 'ls %s\n' "$SF_ROOT" | sf_sftp || fail "sem acesso SSH ao SourceForge ($SF_TARGET)"
ok "acesso ao SourceForge"
read -r PR_NUMBER PR_STATE <<<"$(site_pr)"
[ -n "$PR_NUMBER" ] && [ "$PR_NUMBER" != null ] || fail "PR do site ($SITE_BRANCH) não encontrado"
if [ "$PR_STATE" = OPEN ]; then
  gh pr checks "$PR_NUMBER" -R "$ORG/site" >/dev/null || fail "CI do PR do site #$PR_NUMBER não está verde"
  ok "PR do site #$PR_NUMBER aberto e verde"
else
  ok "PR do site #$PR_NUMBER já está $PR_STATE"
fi
LEAP_DATE="$(curl -fsSI "$LEAP_REPO" | awk -F': ' 'tolower($1)=="last-modified"{print $2}' | tr -d '\r')" \
  || fail "repositório do Leap 16.1 fora do ar: $LEAP_REPO"
ok "repositório do Leap 16.1 no ar (atualizado em $LEAP_DATE)"

# -------------------------------------------------------- 2. dry-run e confirmação
step "2/7 Dry-run da promoção"
bash "$PROMOTE"
if [ "$CHECK_ONLY" -eq 1 ]; then
  echo; ok "checagens e dry-run concluídos (--check); nada foi promovido"
  exit 0
fi
echo
echo "A seguir: tags v16.1 e server-v16.1, publicação em releases/16.1/stable/,"
echo "merge do site, GitHub Releases e fechamento das issues #227 e #41."
read -rp "Promover o Lyra OS 16.1 agora? [s/N] " answer
[[ "$answer" =~ ^[sS]$ ]] || fail "promoção cancelada; nada foi feito"

# ------------------------------------------------------------- 3. promoção
step "3/7 Tags e publicação no SourceForge"
{ printf -- '-mkdir %s/stable\n' "$SF_ROOT"
  printf -- '-mkdir %s/stable/desktop\n' "$SF_ROOT"
  printf -- '-mkdir %s/stable/server\n' "$SF_ROOT"; } | sf_sftp
bash "$PROMOTE" --execute

# ------------------------------------------------------ 4. checksum publicado
step "4/7 Conferência do que foi publicado"
for edition in desktop server; do
  url="$SF_DOWNLOAD/stable/$edition/${PREFIX[$edition]}.iso.sha256"
  for attempt in $(seq 1 20); do
    published="$(curl -fsSL "$url" 2>/dev/null | awk '{print $1}')" || published=""
    [ "$published" = "${SHA256[$edition]}" ] && break
    echo "Aguardando o SourceForge publicar $edition ($attempt/20)..."; sleep 30
  done
  [ "$published" = "${SHA256[$edition]}" ] || fail "checksum em stable/$edition não confere"
  ok "stable/$edition = ${SHA256[$edition]}"
done

# ------------------------------------------------------------------ 5. site
step "5/7 Site"
read -r PR_NUMBER PR_STATE <<<"$(site_pr)"
if [ "$PR_STATE" = OPEN ]; then
  gh pr merge "$PR_NUMBER" -R "$ORG/site" --merge --delete-branch
  ok "PR do site #$PR_NUMBER mesclado"
fi
MERGE_SHA="$(gh pr view "$PR_NUMBER" -R "$ORG/site" --json mergeCommit --jq .mergeCommit.oid)"
RUN_ID=""
for attempt in $(seq 1 30); do
  RUN_ID="$(gh run list -R "$ORG/site" --workflow static.yml --commit "$MERGE_SHA" --limit 1 \
    --json databaseId --jq '.[0].databaseId // empty')"
  [ -n "$RUN_ID" ] && break
  sleep 5
done
[ -n "$RUN_ID" ] || fail "o deploy do site não começou para o commit $MERGE_SHA"
gh run watch "$RUN_ID" -R "$ORG/site" --exit-status >/dev/null || fail "deploy do site falhou (run $RUN_ID)"
ok "deploy do GitHub Pages concluído"
for attempt in $(seq 1 20); do
  page="$(curl -fsSL "$SITE_URL/?promocao=$(date +%s)" || true)"
  if grep -q 'Lyra OS 16.1 já está disponível' <<<"$page" && grep -q 'releases/16.1/stable/desktop/' <<<"$page"; then
    break
  fi
  echo "Aguardando o site em produção ($attempt/20)..."; sleep 30
done
grep -q 'releases/16.1/stable/desktop/' <<<"$page" || fail "$SITE_URL ainda não mostra a 16.1 estável"
ok "$SITE_URL mostra a 16.1 estável"

# ------------------------------------------------------- 6. GitHub Releases
step "6/7 GitHub Releases"
for edition in desktop server; do
  repo="$ORG/${REPO[$edition]}"
  if gh release view "${TAG[$edition]}" -R "$repo" >/dev/null 2>&1; then
    ok "release ${TAG[$edition]} já existe"; continue
  fi
  gh release create "${TAG[$edition]}" -R "$repo" --verify-tag --latest \
    --title "${TITLE[$edition]}" --notes "$(cat <<EOF
${TITLE[$edition]} sobre o openSUSE Leap 16.1, publicado em 03/11/2026.

É a mesma ISO da RC 3, promovida por tag, sem rebuild; os arquivos mantêm o nome da RC 3. As atualizações do Leap 16.1 GA chegam pelo repositório \`update\` depois da instalação.

- Download: https://sourceforge.net/projects/lyra/files/releases/16.1/stable/$edition/
- Notas de lançamento: ${NOTES[$edition]}
- SHA-256 de \`${PREFIX[$edition]}.iso\`: \`${SHA256[$edition]}\`
- Assinatura: chave de release \`01B6 3EED BE6B 0791 26A0 116E FA73 53A1 31EC EFEB\`
EOF
)"
  ok "release ${TAG[$edition]} criada"
done

# ----------------------------------------------------------------- 7. issues
step "7/7 Issues de promoção"
for edition in desktop server; do
  repo="$ORG/${REPO[$edition]}" number="${ISSUE[$edition]}"
  if [ "$(gh issue view "$number" -R "$repo" --json state --jq .state)" = CLOSED ]; then
    ok "$repo#$number já está fechada"; continue
  fi
  gh issue edit "$number" -R "$repo" --title "Promoção da RC 3 à versão estável 16.1 (03/11/2026)" >/dev/null
  gh issue close "$number" -R "$repo" --reason completed --comment "Promovida em $(date '+%d/%m/%Y %H:%M'): tag \`${TAG[$edition]}\`, arquivos em https://sourceforge.net/projects/lyra/files/releases/16.1/stable/$edition/ (SHA-256 \`${SHA256[$edition]}\`), site atualizado em $SITE_URL e release https://github.com/$repo/releases/tag/${TAG[$edition]}."
  ok "$repo#$number comentada e fechada"
done

step "Lyra OS 16.1 promovido"
cat <<EOF
- Desktop: https://sourceforge.net/projects/lyra/files/releases/16.1/stable/desktop/
- Server:  https://sourceforge.net/projects/lyra/files/releases/16.1/stable/server/
- Site:    $SITE_URL
Pendente para depois: abrir o ciclo seguinte em release.toml / release-server.toml.
EOF
