# Timing figure

```yaml
- t: figure
  kind: timing
  cap: The output changes after the input edge
  spec:
    unit: 26
    signals:
      - {name: input, wave: '010110'}
      - {name: output, wave: '001100'}
```

Wave strings use `0` and `1` samples. Name each signal and `unit` sets sample width in pixels; put physical time per sample in the caption.
