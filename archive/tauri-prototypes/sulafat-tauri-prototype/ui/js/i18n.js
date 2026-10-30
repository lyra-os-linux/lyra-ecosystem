// Protótipo: textos já em português; `t` só interpola {variáveis}.
export const locale = "pt-BR";
export const N_ = (s) => s;
export function t(text, vars = {}) {
  return String(text).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}
