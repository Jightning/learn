import test from "node:test";
import assert from "node:assert/strict";
import { parseExpression } from "../../src/figures/expression.js";
import { safeCourseStyles } from "../../src/lib/course-styles.js";

test("plot expressions keep arithmetic and reject code", () => {
  assert.ok(Math.abs(parseExpression("Math.exp(-x/4)")(4) - Math.E ** -1) < 1e-12);
  assert.equal(parseExpression("2*x^2 + 1")(3), 19);
  assert.equal(parseExpression("-x^2")(3), -9);
  for (const source of ["window.alert(1)", "x.constructor", "x;alert(1)",
    "(window.attack=1,x)", "x".repeat(161)]) {
    assert.throws(() => parseExpression(source));
  }
});

test("course CSS permits scoped presentation rules only", () => {
  const course = { valueStyles: { yes: "v-y" }, styleClasses: ["metric", "topbar"] };
  const safe = safeCourseStyles(".v-y{color:var(--hi-ink);font-weight:700}.metric{display:flex;gap:2px}", course);
  assert.ok(safe.includes(".shell:not(.solo) .bhtml .v-y"));
  assert.ok(safe.includes(".shell:not(.solo) .bhtml .metric"));
  assert.equal(safeCourseStyles(".unknown{color:var(--hi-ink)}", course), "");
  assert.ok(safeCourseStyles(".topbar{opacity:0}", course).startsWith(".shell:not(.solo) .bhtml .topbar"));
  assert.equal(safeCourseStyles("body{display:none}", course), "");
  assert.equal(safeCourseStyles(".v-y{background:url(https://example.test/track)}", course), "");
  assert.equal(safeCourseStyles(".v-y{color:var(--hi-ink)}@import 'https://example.test/track'", course), "");
});
