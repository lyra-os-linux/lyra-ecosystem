#!/usr/bin/env bash
# Promoção do Lyra OS 16.1 RC 3 à versão estável 16.1 (19/11/2026).
#
# Decisão do mantenedor em 30/10/2026: a RC 3 é a candidata final e a mesma
# ISO é promovida por tag, sem novo build (lyraos-desktop#227,
# lyraos-server#41). Este script faz, por edição:
#
#   1. preflight: nenhuma issue P0/P1 aberta; a tag da RC 3 aponta para o
#      commit publicado; a tag estável ainda não existe (ou já aponta para o
#      mesmo commit); os arquivos da RC 3 estão no SourceForge;
#   2. bundle: confere o bundle local (--source-dir) ou baixa o da RC 3 do
#      SourceForge para republicar, e verifica o SHA-256 publicado e a
#      assinatura da chave oficial de release;
#   3. tag: cria e envia a tag estável (v16.1 / server-v16.1) no mesmo commit;
#   4. publish: envia o bundle para releases/16.1/<destino>/<edição>/.
#
# Sem --execute, só mostra o que faria (nenhuma tag, nenhum upload). O site,
# as notas da versão estável e o fechamento das issues continuam manuais; o
# resumo final lista esses passos.
#
# Uso:
#   scripts/promote-16.1.sh                      # dry-run das duas edições
#   scripts/promote-16.1.sh --execute            # promove as duas
#   scripts/promote-16.1.sh --edition server --execute
#   scripts/promote-16.1.sh --source-dir desktop=/caminho --source-dir server=/caminho
#   scripts/promote-16.1.sh --dest stable        # pasta no SourceForge (padrão: stable)
#
# Requer: git, gh (autenticado), gpg com a chave pública de release, curl,
# rsync, ssh com acesso a rodrigobritosoa@frs.sourceforge.net e os clones
# lyraos-desktop e lyraos-server lado a lado (ou LYRA_WORKSPACE).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
WORKSPACE="${LYRA_WORKSPACE:-$(dirname "$(dirname "$SCRIPT_DIR")")}"
RELEASE_SIGNING_FINGERPRINT="01B63EEDBE6B079126A0116EFA7353A131ECEFEB"
SF_USER="rodrigobritosoa"
SF_HOST="frs.sourceforge.net"
SF_HOST_KEY='frs.sourceforge.net ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOQD35Ujalhh+JJkPvMckDlhu4dS7WH6NsOJ15iGCJLC'
SF_DOWNLOAD="https://downloads.sourceforge.net/project/lyra/releases/16.1"

# Os candidatos publicados em 30/10/2026; a promoção não aceita outros.
declare -A REPO=([desktop]=lyraos-desktop [server]=lyraos-server)
declare -A LABEL=([desktop]=desktop [server]=server)
declare -A RC_TAG=([desktop]=v16.1-rc.3 [server]=server-v16.1-rc.3)
declare -A STABLE_TAG=([desktop]=v16.1 [server]=server-v16.1)
declare -A COMMIT=(
  [desktop]=70e4bf9805b3caaa32052585ffce75467a282acd
  [server]=9c49dba334c9f935e39d1ae550ddf40170d91c5a
)
declare -A PREFIX=(
  [desktop]=LyraOS-Desktop-16.1-rc.3-x86_64
  [server]=LyraOS-Server-16.1-rc.3-x86_64
)
declare -A SHA256=(
  [desktop]=50211bcf31271d232ea4326fc46704cad79a729d1bb363679ce32829d7794a3a
  [server]=1bcb55a7842487ee463bf40640b882f34dd00e1a9a1a31d539a8de39919b7a45
)
declare -A PRODUCT=([desktop]="Lyra OS Desktop 16.1" [server]="Lyra OS Server 16.1")

bundle_files() {
  local prefix="${PREFIX[$1]}"
  local files=(README.md "$prefix.cdx.json" "$prefix.iso" "$prefix.iso.manifest.json"
    "$prefix.iso.sha256" "$prefix.iso.sha256.asc" "$prefix.packages" "$prefix.report"
    "$prefix.spdx.json" "$prefix.verified")
  if [ "$1" = desktop ]; then
    files+=("$prefix.evidence.json" "$prefix.release-decision.json")
  fi
  printf '%s\n' "${files[@]}"
}

EXECUTE=0
DEST="stable"
EDITIONS=(desktop server)
declare -A SOURCE_DIR=()

usage() { sed -n '2,32p' "$0" | sed 's/^# \{0,1\}//'; }

while [ "$#" -gt 0 ]; do
  case "$1" in
    --execute) EXECUTE=1 ;;
    --edition)
      shift
      case "${1:-}" in
        desktop|server) EDITIONS=("$1") ;;
        all) EDITIONS=(desktop server) ;;
        *) echo "ERRO: --edition desktop|server|all" >&2; exit 2 ;;
      esac ;;
    --source-dir)
      shift
      case "${1:-}" in
        desktop=*|server=*) SOURCE_DIR[${1%%=*}]="${1#*=}" ;;
        *) echo "ERRO: --source-dir desktop=DIR ou server=DIR" >&2; exit 2 ;;
      esac ;;
    --dest)
      shift
      [[ "${1:-}" =~ ^[a-z0-9][a-z0-9.-]*$ ]] || { echo "ERRO: --dest inválido" >&2; exit 2; }
      DEST="$1" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERRO: opção desconhecida: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

step() { printf '\n== %s\n' "$*"; }
fail() { echo "ERRO: $*" >&2; exit 1; }
run() {
  if [ "$EXECUTE" -eq 1 ]; then
    "$@"
  else
    printf '[dry-run]'; printf ' %q' "$@"; printf '\n'
  fi
}

for tool in git gh gpg curl rsync ssh sha256sum; do
  command -v "$tool" >/dev/null || fail "ferramenta ausente: $tool"
done
gh auth status >/dev/null 2>&1 || fail "gh não está autenticado (gh auth login)"
gpg --list-keys "$RELEASE_SIGNING_FINGERPRINT" >/dev/null 2>&1 \
  || fail "chave pública de release ausente; importe lyraos-desktop/docs/release-signing-key.asc"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/lyra-promote-16.1.XXXXXX")"
trap 'rm -rf -- "$WORK"' EXIT
KNOWN_HOSTS="$WORK/known_hosts"
printf '%s\n' "$SF_HOST_KEY" >"$KNOWN_HOSTS"

verify_signature() {
  local valid
  valid="$(gpg --batch --status-fd 1 --verify "$1" "$2" 2>/dev/null \
    | awk '$1 == "[GNUPG:]" && $2 == "VALIDSIG" { print $3 }')"
  [ "$valid" = "$RELEASE_SIGNING_FINGERPRINT" ] || fail "assinatura de $2 não é da chave oficial"
}

preflight() {
  local edition="$1" repo="lyra-os-linux/${REPO[$1]}" clone="$WORKSPACE/${REPO[$1]}"
  step "${PRODUCT[$edition]}: preflight"
  local blockers
  blockers="$(gh issue list -R "$repo" --state open --label "${LABEL[$edition]}" --limit 200 \
    --json number,title --jq '.[] | select(.title | test("\\[P[01]\\]"; "i")) | "#\(.number) \(.title)"')"
  [ -z "$blockers" ] || fail "P0/P1 aberta em $repo; promoção bloqueada:"$'\n'"$blockers"
  echo "OK: nenhuma P0/P1 aberta em $repo"

  [ -d "$clone/.git" ] || fail "clone ausente: $clone"
  git -C "$clone" fetch --quiet --tags origin
  local rc_commit
  rc_commit="$(git -C "$clone" rev-parse "refs/tags/${RC_TAG[$edition]}^{commit}" 2>/dev/null)" \
    || fail "tag ${RC_TAG[$edition]} ausente em $repo"
  [ "$rc_commit" = "${COMMIT[$edition]}" ] || fail "${RC_TAG[$edition]} aponta para $rc_commit, não para ${COMMIT[$edition]}"
  echo "OK: ${RC_TAG[$edition]} = ${COMMIT[$edition]}"
  local stable_commit
  if stable_commit="$(git -C "$clone" rev-parse "refs/tags/${STABLE_TAG[$edition]}^{commit}" 2>/dev/null)"; then
    [ "$stable_commit" = "${COMMIT[$edition]}" ] || fail "${STABLE_TAG[$edition]} já existe em outro commit ($stable_commit)"
    echo "OK: ${STABLE_TAG[$edition]} já existe no mesmo commit"
  else
    echo "OK: ${STABLE_TAG[$edition]} ainda não existe"
  fi

  local published
  published="$(curl -fsSL --retry 3 "$SF_DOWNLOAD/rc3/$edition/${PREFIX[$edition]}.iso.sha256")" \
    || fail "checksum da RC 3 indisponível no SourceForge (rc3/$edition)"
  [ "${published%% *}" = "${SHA256[$edition]}" ] || fail "checksum publicado difere do da RC 3"
  echo "OK: checksum publicado em rc3/$edition = ${SHA256[$edition]}"
}

prepare_bundle() {
  local edition="$1" dir
  step "${PRODUCT[$edition]}: bundle"
  if [ -n "${SOURCE_DIR[$edition]:-}" ]; then
    dir="${SOURCE_DIR[$edition]}"
    echo "Usando o bundle local: $dir"
  else
    dir="$WORK/$edition"
    mkdir -p "$dir"
    echo "Sem --source-dir: o bundle da RC 3 é baixado do SourceForge para ser republicado."
    if [ "$EXECUTE" -eq 0 ]; then
      echo "[dry-run] baixaria $(bundle_files "$edition" | wc -l) arquivos de $SF_DOWNLOAD/rc3/$edition/"
      BUNDLE_DIR="$dir"
      return
    fi
    while IFS= read -r file; do
      curl -fL --retry 5 --output "$dir/$file" "$SF_DOWNLOAD/rc3/$edition/$file"
    done < <(bundle_files "$edition")
  fi
  while IFS= read -r file; do
    [ -s "$dir/$file" ] || fail "arquivo ausente no bundle: $dir/$file"
  done < <(bundle_files "$edition")
  local prefix="${PREFIX[$edition]}"
  [ "$(awk '{print $1}' "$dir/$prefix.iso.sha256")" = "${SHA256[$edition]}" ] \
    || fail "o .sha256 do bundle não é o da RC 3"
  (cd "$dir" && sha256sum -c "$prefix.iso.sha256")
  verify_signature "$dir/$prefix.iso.sha256.asc" "$dir/$prefix.iso.sha256"
  echo "OK: bundle íntegro e assinado pela chave oficial"
  BUNDLE_DIR="$dir"
}

tag_stable() {
  local edition="$1" clone="$WORKSPACE/${REPO[$1]}"
  step "${PRODUCT[$edition]}: tag ${STABLE_TAG[$edition]}"
  if git -C "$clone" rev-parse -q --verify "refs/tags/${STABLE_TAG[$edition]}" >/dev/null; then
    echo "A tag já existe no mesmo commit; nada a fazer."
  else
    run git -C "$clone" tag -a "${STABLE_TAG[$edition]}" -m "${PRODUCT[$edition]}" "${COMMIT[$edition]}"
  fi
  run git -C "$clone" push origin "refs/tags/${STABLE_TAG[$edition]}"
}

publish() {
  local edition="$1" remote="$SF_USER@$SF_HOST:/home/frs/project/lyra/releases/16.1/$DEST/$1/"
  step "${PRODUCT[$edition]}: publicação em releases/16.1/$DEST/$edition/"
  local files=()
  while IFS= read -r file; do files+=("$BUNDLE_DIR/$file"); done < <(bundle_files "$edition")
  run rsync -avP --partial \
    -e "ssh -o UserKnownHostsFile=$KNOWN_HOSTS -o StrictHostKeyChecking=yes" \
    "${files[@]}" "$remote"
}

if [ "$EXECUTE" -eq 1 ]; then
  echo "Modo EXECUTAR: tags e uploads serão feitos."
else
  echo "Modo DRY-RUN: nenhuma tag nem upload. Use --execute para promover."
fi
echo "Destino no SourceForge: releases/16.1/$DEST/<edição>/ (a pasta precisa existir)."

for edition in "${EDITIONS[@]}"; do preflight "$edition"; done
for edition in "${EDITIONS[@]}"; do
  BUNDLE_DIR=""
  prepare_bundle "$edition"
  tag_stable "$edition"
  publish "$edition"
done

step "Próximos passos (manuais)"
cat <<EOF
- Notas da versão estável 16.1 e site (download, notas, versões, anúncio),
  apontando para releases/16.1/$DEST/.
- Comentar o resultado e fechar lyraos-desktop#227 e lyraos-server#41.
- Abrir o ciclo seguinte em release.toml / release-server.toml.
EOF
