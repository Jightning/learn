import { tierOf } from "../lib/tiers.js";

/* One quiet control stays in the rail while its content opens and closes. */
export function DepthTab({ items, open, controls, onToggle }) {
  const depth = items.some(it => tierOf(it.b) === "depth");
  const apply = items.some(it => tierOf(it.b) === "apply");
  const label = depth ? (apply ? "In depth · Examples" : "In depth") : "Examples";
  return (
    <button class={"dtab" + (open ? " is-open" : "")}
            aria-expanded={open} aria-controls={controls}
            title={open ? "Hide this content" : "Show this content"}
            onClick={onToggle}>
      <span class="dtab-chev" aria-hidden="true">{open ? "▾" : "▸"}</span>
      <span class="dtab-t">{label}</span>
    </button>
  );
}
