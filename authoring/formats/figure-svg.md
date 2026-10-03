# SVG figure

```yaml
- t: figure
  kind: svg
  cap: The custom schematic shows the connection
  spec:
    viewBox: '0 0 360 240'
    body: '<path d="M20 20h120" stroke="currentColor"/>'
```

Use `svg` only when a data figure cannot express the visual. Keep the body to
the supported SVG shapes and source or disclose the artwork. Prefer a supplied
image when the visual is a scan or photograph.
