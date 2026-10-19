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
`rect`, `ellipse`, and `text`. Lines/arrows need exactly two `points`; use
`path` for a multi-segment wire. Rectangles use top-left `x,y`; ellipses use
center `x,y`; both take `w,h`. Keep wire endpoints and junction centers
coincident. `accent` is 0–3. `alt` is required.
