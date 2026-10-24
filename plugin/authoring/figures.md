# Visual delivery and uncommon formats

Use built-in figures, slides, tables, images or math before custom code. Load
only the chosen `formats/figure-*.md`, `formats/slides.md`, `formats/images.md`
or `formats/math.md` recipe; examples for uncommon shapes remain selectable.

First inspect suitable figures in assigned sources, not just extracted text.
Otherwise search authoritative sources for an accurate, reusable image or draw
a focused schematic. Trace the depicted connections and state against the worked
case; separate labels from wires and symbols. If a native format
lacks needed symbols, use a drawing or image and load its recipe; do not drop
the visual or invent fields. Report any remaining capability gap explicitly.
Image acquisition and attribution belong to formats/images.md.

Figures need `kind`, `cap` and a finite, bounded `spec`; tables need `cap` and
string cells; images need a course-asset `src`, `alt` and `cap`. Captions state
the reader-visible claim. Colour cannot carry meaning alone; retain AA
contrast in light/dark modes. Custom `blocks.js` is the last resort after the
built-in shapes, including table maps and claim/example blocks; use scoped
styles and a registered name.
