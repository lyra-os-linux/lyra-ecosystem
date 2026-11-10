#!/usr/bin/env python3
"""Gera os relatórios de issues da organização lyra-os-linux.

Uso (na raiz do lyra-ecosystem): python3 relatorios/gerar_relatorios.py  (precisa do `gh` autenticado)

Escreve, ao lado deste script:
  bugs.md          issues com o label `bug`
  apps-android.md  milestone "Apps Android" ou label `aguardando-estabilizar`
  demais.md        todas as outras

Situação de cada issue:
  Na fila    aberta, sem PR nem commit que a cite;
  Começou    há PR (aberto ou mergeado) ou commit que cita a issue;
  Entregue   fechada como concluída (COMPLETED);
  Não planejada  fechada como "not planned" (não entregue).
Citar a issue não prova trabalho (notas de versão também citam): a coluna
Evidência mostra o que sustenta a classificação.
"""
import json
import subprocess
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ORG = "lyra-os-linux"
OUT = Path(__file__).resolve().parent
TZ = ZoneInfo("America/Sao_Paulo")
QUERY = """query($o:String!,$r:String!,$c:String){repository(owner:$o,name:$r){
issues(first:50,after:$c,orderBy:{field:CREATED_AT,direction:ASC}){pageInfo{hasNextPage endCursor}
nodes{number title url state stateReason createdAt closedAt labels(first:20){nodes{name}} milestone{title}
closedByPullRequestsReferences(first:10,includeClosedPrs:true){nodes{number state url repository{name}}}
timelineItems(first:100,itemTypes:[CROSS_REFERENCED_EVENT,REFERENCED_EVENT,CONNECTED_EVENT,CLOSED_EVENT]){nodes{__typename
 ... on CrossReferencedEvent{source{__typename ... on PullRequest{number state url repository{name}}}}
 ... on ReferencedEvent{commit{abbreviatedOid url}}
 ... on ConnectedEvent{subject{__typename ... on PullRequest{number state url repository{name}}}}
 ... on ClosedEvent{closer{__typename ... on PullRequest{number state url repository{name}} ... on Commit{abbreviatedOid url}}}}}}}}}"""


def gh(*args, attempts=3):
    """`gh` with JSON output; retries transient network failures."""
    for attempt in range(1, attempts + 1):
        try:
            return json.loads(subprocess.check_output(["gh", *args]))
        except subprocess.CalledProcessError:
            if attempt == attempts:
                raise
            time.sleep(5 * attempt)


def collect():
    issues = []
    for repo in sorted(r["name"] for r in gh("repo", "list", ORG, "--limit", "500", "--json", "name")):
        cursor = None
        while True:
            args = ["api", "graphql", "-f", "query=" + QUERY, "-F", "o=" + ORG, "-F", "r=" + repo]
            if cursor:
                args += ["-f", "c=" + cursor]
            page = gh(*args)["data"]["repository"]["issues"]
            for issue in page["nodes"]:
                issue["repo"] = repo
                issues.append(issue)
            if not page["pageInfo"]["hasNextPage"]:
                break
            cursor = page["pageInfo"]["endCursor"]
    return issues


def evidence(issue):
    """PRs and commits that cite or close the issue, as Markdown links."""
    prs, commits = {}, {}

    def pr(node):
        prs[(node["repository"]["name"], node["number"])] = (node["state"], node["url"])

    for node in issue["closedByPullRequestsReferences"]["nodes"]:
        pr(node)
    for node in issue["timelineItems"]["nodes"]:
        kind = node["__typename"]
        if kind == "CrossReferencedEvent" and node["source"] and node["source"]["__typename"] == "PullRequest":
            pr(node["source"])
        elif kind == "ConnectedEvent" and node["subject"] and node["subject"]["__typename"] == "PullRequest":
            pr(node["subject"])
        elif kind == "ReferencedEvent" and node["commit"]:
            commits[node["commit"]["abbreviatedOid"]] = node["commit"]["url"]
        elif kind == "ClosedEvent" and node["closer"]:
            closer = node["closer"]
            if closer["__typename"] == "PullRequest":
                pr(closer)
            elif closer["__typename"] == "Commit":
                commits[closer["abbreviatedOid"]] = closer["url"]
    state = {"MERGED": "mergeado", "OPEN": "aberto", "CLOSED": "fechado"}
    links = [f"[{repo}#{num}]({url}) ({state[st]})" for (repo, num), (st, url) in sorted(prs.items())]
    links += [f"[{oid}]({url})" for oid, url in sorted(commits.items())]
    return links


def situation(issue, links):
    if issue["state"] == "CLOSED":
        return "Não planejada" if issue["stateReason"] == "NOT_PLANNED" else "Entregue"
    return "Começou" if links else "Na fila"


def date(stamp):
    if not stamp:
        return "—"
    return datetime.fromisoformat(stamp.replace("Z", "+00:00")).astimezone(TZ).strftime("%d/%m/%Y")


def category(issue):
    labels = {label["name"] for label in issue["labels"]["nodes"]}
    milestone = (issue["milestone"] or {}).get("title")
    if milestone == "Apps Android" or "aguardando-estabilizar" in labels:
        return "apps-android"
    return "bugs" if "bug" in labels else "demais"


def cell(text):
    return text.replace("|", "\\|").replace("\n", " ")


ORDER = ["Na fila", "Começou", "Entregue", "Não planejada"]
TITLES = {"bugs": "Bugs", "apps-android": "Apps Android", "demais": "Demais issues"}
SCOPE = {
    "bugs": "Issues com o label `bug`, abertas e fechadas (exceto as de Apps Android).",
    "apps-android": "Issues da milestone **Apps Android** ou com o label `aguardando-estabilizar`.",
    "demais": "Todas as outras issues da organização, abertas e fechadas.",
}


def write(name, issues, generated):
    rows = []
    counts = defaultdict(Counter)
    for issue in issues:
        links = evidence(issue)
        status = situation(issue, links)
        counts[issue["repo"]][status] += 1
        rows.append((issue, links, status))
    lines = [f"# {TITLES[name]}", "",
             f"Gerado em {generated} a partir do GitHub (`{ORG}`). {SCOPE[name]}",
             "Para atualizar: `python3 relatorios/gerar_relatorios.py`.", "",
             "Situação: **Na fila** = aberta, sem PR nem commit que a cite · **Começou** = há PR ou commit "
             "que cita a issue (citar não prova trabalho: veja a evidência) · **Entregue** = fechada como "
             "concluída · **Não planejada** = fechada sem entrega.", "",
             "## Resumo", "",
             "| Repositório | Total | " + " | ".join(ORDER) + " |",
             "| --- | ---: | " + " | ".join("---:" for _ in ORDER) + " |"]
    total = Counter()
    for repo in sorted(counts):
        total.update(counts[repo])
        lines.append(f"| {repo} | {sum(counts[repo].values())} | " + " | ".join(str(counts[repo][s]) for s in ORDER) + " |")
    lines.append(f"| **Total** | **{sum(total.values())}** | " + " | ".join(f"**{total[s]}**" for s in ORDER) + " |")
    by_repo = defaultdict(list)
    for row in rows:
        by_repo[row[0]["repo"]].append(row)
    for repo in sorted(by_repo):
        lines += ["", f"## {repo}", "",
                  "| Issue | Título | Labels | Milestone | Aberta em | Na fila | Começou | Entregue | Fechada em | Evidência |",
                  "| --- | --- | --- | --- | --- | :---: | :---: | :---: | --- | --- |"]
        for issue, links, status in sorted(by_repo[repo], key=lambda r: r[0]["number"]):
            labels = ", ".join(f"`{l['name']}`" for l in issue["labels"]["nodes"]) or "—"
            milestone = (issue["milestone"] or {}).get("title") or "—"
            queue = "Sim" if status == "Na fila" else "Não"
            started = "Sim" if status in ("Começou", "Entregue") or links else "Não"
            delivered = "Sim" if status == "Entregue" else ("Não planejada" if status == "Não planejada" else "Não")
            lines.append(f"| [#{issue['number']}]({issue['url']}) | {cell(issue['title'])} | {labels} | {cell(milestone)} | "
                         f"{date(issue['createdAt'])} | {queue} | {started} | {delivered} | {date(issue['closedAt'])} | "
                         f"{', '.join(links) or '—'} |")
    (OUT / f"{name}.md").write_text("\n".join(lines) + "\n")
    return total


def main():
    issues = collect()
    generated = datetime.now(timezone.utc).astimezone(TZ).strftime("%d/%m/%Y %H:%M")
    groups = defaultdict(list)
    for issue in issues:
        groups[category(issue)].append(issue)
    for name in ["bugs", "apps-android", "demais"]:
        total = write(name, groups[name], generated)
        print(f"{name}.md: {sum(total.values())} issues — " + ", ".join(f"{s}: {total[s]}" for s in ORDER))


if __name__ == "__main__":
    main()
