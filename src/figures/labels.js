/* SVG text uses the figure's monospaced font. Reserve a little more than its
 * measured advance so labels remain separate at different font weights. */
export const textWidth = (value, size = 12) => String(value).length * size * 0.65;

export const textBox = (x, baseline, value, size = 12, pad = 3) => ({
  x: x - textWidth(value, size) / 2 - pad,
  y: baseline - size - pad,
  w: textWidth(value, size) + 2 * pad,
  h: size + 2 * pad
});

export const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w &&
  a.y < b.y + b.h && b.y < a.y + a.h;

/** Move a label away from its anchor until it clears the reserved rectangles. */
export function placeLabel(x, y, value, size, reserved, directions = [[0, -1], [0, 1]], step = size + 7) {
  for (let distance = 0; distance < 40; distance++) {
    for (const [dx, dy] of directions) {
      const px = x + dx * distance * step;
      const py = y + dy * distance * step;
      const box = textBox(px, py, value, size);
      if (!reserved.some(other => overlaps(box, other))) {
        reserved.push(box);
        return { x: px, y: py, box };
      }
    }
  }
  const box = textBox(x, y, value, size);
  reserved.push(box);
  return { x, y, box };
}
