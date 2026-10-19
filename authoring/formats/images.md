# Image block

```yaml
- t: image
  id: slope-field
  src: assets/slope-field.png
  alt: Slope field with three solution curves
  cap: Solution curves are tangent to the slope field everywhere
  credit: Redrawn from OpenStax Calculus Volume 2 §4.2
  width: 460
```

Assets may be PNG, JPEG, GIF, WebP, or SVG. The build checks the resolved path
and total asset size. `alt` describes the visual; `cap` states its reader-facing
claim and is what read-aloud speaks.

For an external image, inspect the original source page and full-resolution
figure, check its accuracy and reuse terms, and retain the source URL, creator
and any required license/attribution in the credit or source record. Save the
permitted asset under course `assets/`; `src` is a local path, not a remote
hotlink. Redraw when that yields a clearer, properly attributed explanation;
do not assume that appearing in image search grants reuse. Verify readable
labels and the described relationships in the final desktop/mobile reader.
