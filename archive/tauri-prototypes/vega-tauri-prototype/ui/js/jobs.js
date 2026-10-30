// Tarefas longas (atualizações, driver, backup). Ficam visíveis no botão de
// tarefas do cabeçalho em qualquer página, e cada página pode reagir a elas.

import { api } from "./api.js";
import { h, icon, clear, meter, popover, toast } from "./ui.js";

const jobs = new Map();
const listeners = new Set();
const finishers = new Map();

export function onJobs(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const allJobs = () => [...jobs.values()];
export const running = (kind) => allJobs().find((j) => j.kind === kind && j.state === "running");

/** Inicia uma tarefa; `onDone` roda uma vez quando ela termina. */
export async function startJob(kind, title, onDone) {
  const id = await api.startJob(kind, title);
  jobs.set(id, { id, kind, title, state: "running", percent: 0, step: "Iniciando…", log: [], started: Date.now() });
  if (onDone) finishers.set(id, onDone);
  emit();
  return id;
}

function emit() {
  listeners.forEach((fn) => fn(allJobs()));
}

api.onJob((event) => {
  const job = jobs.get(event.id) ?? { id: event.id, kind: event.kind, title: event.title, log: [], started: Date.now() };
  Object.assign(job, { state: event.state, percent: event.percent, step: event.step });
  if (event.log) job.log.push(event.log);
  jobs.set(event.id, job);
  if (event.state === "done") {
    finishers.get(event.id)?.(job);
    finishers.delete(event.id);
    toast(`${job.title}: concluído`, { ic: "check-circle" });
  }
  emit();
});

// ---------- Botão e popover do cabeçalho ----------

export function mountJobsButton(button) {
  const paint = () => {
    const active = allJobs().filter((j) => j.state === "running");
    clear(button, active.length ? h("span", { class: "spinner" }) : icon("tasks", 17));
    button.title = active.length ? `${active.length} tarefa(s) em andamento` : "Tarefas";
    if (!active.length && allJobs().length) button.append(h("i", { class: "badge-dot" }));
  };
  onJobs(paint);
  paint();

  button.addEventListener("click", () => {
    const body = h("div");
    const render = () => {
      const items = allJobs().sort((a, b) => b.started - a.started);
      clear(
        body,
        h("div", { class: "popover-head" }, "Tarefas"),
        items.length === 0
          ? h("div", { class: "empty", style: { padding: "18px 16px 26px" } }, icon("tasks", 28, "ic faint"), h("p", { class: "small" }, "Nenhuma tarefa nesta sessão. Atualizações, backups e instalações aparecem aqui."))
          : items.map((job) =>
              h(
                "div",
                { class: "task" },
                h("div", { class: "task-top" }, job.state === "running" ? h("span", { class: "spinner" }) : icon("check-circle", 16, "ic"), job.title, h("span", { class: "pct" }, job.state === "running" ? `${Math.round(job.percent)}%` : "Concluída")),
                job.state === "running" ? meter(job.percent / 100) : null,
                h("small", {}, job.step),
              ),
            ),
      );
    };
    render();
    const pop = popover(button, body);
    const off = onJobs(() => (document.body.contains(pop) ? render() : off()));
  });
}
