import { HUES, hueFor, setHue } from "../lib/theme.js";

/* The course's accent, as the reader wants it.
 *
 * The palette is one angle — four accent tokens rotated together — so this is
 * the whole of what a colour setting can offer here, and that is the point: a
 * swatch cannot produce a combination the contrast sweep has not already
 * covered, because every rotation keeps lightness and chroma fixed.
 *
 * The author's choice is an option rather than an absence. "Course" is first
 * and is what an untouched course is on, so the reader can always see that
 * there is something to go back to and what it would look like — a swatch row
 * whose default state is nothing selected reads as broken.
 *
 * Swatches carry no label and need none: they are the colour itself, which is
 * the one thing a word could only approximate. `data-hue` is what makes each
 * one paint in its own rotation — the token block in 00-tokens.css redeclares
 * the palette against any element carrying it, which is the same mechanism the
 * library's cards use to sit six accents on one page.
 */
export default function HueSelect({ cid, onHue }) {
  const cur = hueFor(cid);
  const pick = h => { setHue(cid, h); onHue && onHue(); };

  return (
    <div class="hues" role="group" aria-label="Course colour">
      <span class="lane-l">Colour</span>
      <span class="hue-set">
        <button class={"hue-b hue-own" + (cur == null ? " sel" : "")}
                aria-pressed={cur == null} data-hue-pick="own"
                title="The colour this course ships with"
                onClick={() => pick(null)}>Course</button>
        {HUES.map((h, i) => (
          <button key={h} class={"hue-b" + (cur === h ? " sel" : "")}
                  data-hue data-hue-pick={h} style={`--hue:${h}`}
                  aria-pressed={cur === h} aria-label={`Colour ${i + 1} of ${HUES.length}`}
                  onClick={() => pick(h)} />
        ))}
      </span>
    </div>
  );
}
