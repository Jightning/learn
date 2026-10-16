import { MODES, modeOf, nearestMode } from "../lib/mode.js";

/* Reading resolution stays in the toolbar, close to the current passage. */
export default function ModeSwitch({ lane, depth, onMode }) {
  const exact = modeOf(lane, depth);
  const shown = exact || nearestMode(lane, depth);
  const i = Math.max(0, MODES.findIndex(m => m.id === shown));

  return (
    <div class="modesw" role="group" aria-label="Reading mode">
      {/* Below the drawer breakpoint the three become one that cycles, named by
          the mode it is in. Three fixed labels plus Menu and Search do not fit
          a 390px bar, and the mode matters more on a phone than on a desktop,
          so it stays in the bar rather than moving into the drawer.
          Both forms render and the stylesheet picks, so neither has to ask the
          viewport a question in JavaScript. */}
      <button class="modesw-b modesw-cycle" aria-label={`Reading mode: ${MODES[i].label}`}
              title={MODES[i].hint}
              onClick={() => onMode(MODES[(i + 1) % MODES.length])}>
        {MODES[i].label}{!exact && <i class="modesw-e" aria-hidden="true" />}
      </button>
      {MODES.map(m => {
        const on = m.id === shown;
        return (
          <button key={m.id} class={"modesw-b" + (on ? " sel" : "")}
                  aria-pressed={on} title={m.hint}
                  onClick={() => onMode(m)}>
            {m.label}
            {on && !exact && <i class="modesw-e" aria-hidden="true"
                                title="the saved reading resolution is unavailable" />}
          </button>
        );
      })}
    </div>
  );
}
