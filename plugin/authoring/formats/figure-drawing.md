# Drawing figure

```yaml
- t: figure
  kind: drawing
  cap: The annotated shape marks the boundary
  spec:
    w: 360
    h: 240
    alt: A rectangle with an arrow at its upper edge
    shapes:
      - {type: rect, x: 20, y: 40, w: 120, h: 80, accent: 0}
      - {type: arrow, points: [[80, 20], [80, 40]], label: boundary}
      - {type: text, x: 30, y: 70, text: Inside}
```

Coordinates are pixels in the viewBox. Shapes are `line`, `arrow`, `path`,
`rect`, `ellipse`, and `text`; lines, arrows, and paths use `points`, while
rectangles and ellipses use `x,y,w,h`. `accent` is 0–3. `alt` is required.
