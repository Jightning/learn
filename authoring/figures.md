# Visual and uncommon formats

This baseline names the contract. Load the individually selectable
`formats/figure-*.md`, `formats/slides.md`, `formats/images.md`, and
`formats/math.md` modules for the requested shape; they preserve the exact
renderer fields and constraints without loading every format into each packet.

Use a built-in figure, slides, table, image, or math block before custom code.
Figures need `kind`, `cap`, and finite, bounded `spec`; tables need `cap` and
string cells; images need `src`, `alt`, and `cap` and must resolve under the
course assets. Captions describe the reader-visible claim. Colour never carries
meaning alone and must retain AA contrast in light and dark modes.

Uncommon block shapes remain available in the separate `examples/` modules.
Load those modules only when the plan requests the shape. Custom `blocks.js` is
the last resort, after checking `figure`, `slides`, `table map:`, `def`, `key`,
and `ex`; custom code must use the course's scoped styles and registered name.
