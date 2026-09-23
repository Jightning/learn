import test from "node:test";
import assert from "node:assert/strict";
import { topics } from "../../tools/lib/sources.mjs";

test("large embedded asset lines do not stall heading discovery", () => {
  const asset = "aB".repeat(100_000);
  const found = topics(`# Notes\n## First topic\n${asset}\n## Second topic\nThe second lesson.`);
  assert.deepEqual(found.map(topic => topic.heading), ["Notes", "First topic", "Second topic"]);
  assert.match(found[2].body, /The second lesson/);
});

test("slide HTML headings survive while scripts and image data are excluded", () => {
  const html = `<!DOCTYPE html><html><head><style>.slide { color:red }</style>
    <script>const data = "${"aB".repeat(100_000)}";</script></head><body>
    <section><h1>Lecture 8</h1><img src="data:image/png;base64,${"AB".repeat(100_000)}">
    <h2>Maximum power transfer</h2><p>The matched load takes the most power.</p></section>
    </body></html>`;
  const found = topics(html);
  assert.deepEqual(found.map(topic => topic.heading), ["Lecture 8", "Maximum power transfer"]);
  assert.match(found[1].body, /matched load takes the most power/);
  assert.doesNotMatch(found.map(topic => topic.body).join(" "), /const data|base64|color:red/);
});
