# Slide sequence

```yaml
- t: slides
  id: binary-search-trace
  cap: Binary search narrows the candidate range
  frames:
    - {title: Start, text: '<p>Compare the target with the middle item.</p>'}
    - title: Narrow
      text: '<p>Discard the half that cannot contain the target.</p>'
      figure: {kind: drawing, spec: {w: 320, h: 120, alt: Three boxes with the middle box highlighted, shapes: [{type: rect, x: 20, y: 30, w: 80, h: 40}]}}
```

Each frame has `title`, HTML `text`, and at most one `figure` or `image`. The
deck has one numbered caption; inner visuals are not separately numbered. Keep
the essential conclusion in adjacent prose for review and read-aloud.
