import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("reimporting a course replaces the parsed lesson", async () => {
  const server = await createServer({ logLevel: "silent", server: { middlewareMode: true, hmr: false }, appType: "custom" });
  try {
    const library = await server.ssrLoadModule("/lib/library.js");
    const courses = await server.ssrLoadModule("/lib/courses.js");
    const id = "refresh-test-course";
    const base = {
      "course.yaml": "code: REFRESH-TEST\ntitle: Cache test\n",
      "sections/01-one/_section.yaml": "title: One\n"
    };
    const withLesson = h => ({ ...base,
      "sections/01-one/1-first.yaml": `title: First\nblocks:\n  - t: p\n    h: ${h}\n`
    });

    await courses.importCourse(id, withLesson("old"));
    library.refresh();
    assert.equal((await library.get(id)).sections[0].subs[0].blocks[0].h, "old");

    await courses.importCourse(id, withLesson("new"));
    library.refresh();
    assert.equal((await library.get(id)).sections[0].subs[0].blocks[0].h, "new");

    await courses.removeCourse(id);
    library.refresh();
    assert.equal(library.peek(id), null);

    /* A backup may contain a stale copy of a bundled demo. It must not replace
       the bytes shipped by the current site, or restoring a device hides new
       lessons and visual examples. */
    await courses.importCourse("demo", {
      "course.yaml": "code: DEMO\ntitle: Stale restored copy\n",
      "sections/01-old/_section.yaml": "title: Old\n"
    });
    library.refresh();
    assert.notEqual(library.INDEX.demo.title, "Stale restored copy");
    await courses.removeCourse("demo");
    library.refresh();
  } finally {
    await server.close();
  }
});


test("catalog additions are explicit and independent of hiding or restoring DEMO", async () => {
  const server = await createServer({ logLevel: "silent", server: { middlewareMode: true, hmr: false }, appType: "custom" });
  try {
    const library = await server.ssrLoadModule("/lib/library.js");
    library.refresh();
    assert.deepEqual(library.ORDER, ["demo"]);
    assert.ok(library.dismissed().includes("mvcalc"));
    assert.ok(library.catalog().some(c => c.id === "mvcalc"));
    library.setDismissed("demo", true);
    assert.deepEqual(library.ORDER, []);
    library.setDismissed("demo", false);
    assert.deepEqual(library.ORDER, ["demo"]);
    library.setDismissed("mvcalc", false);
    library.refresh();
    assert.deepEqual(library.ORDER, ["demo", "mvcalc"]);
    library.setDismissed("mvcalc", true);
    library.refresh();
    assert.deepEqual(library.ORDER, ["demo"]);
    assert.ok(library.INDEX.mvcalc, "hidden catalog course still resolves from links");
    library.setDismissed("mvcalc", false);
    assert.deepEqual(library.ORDER, ["demo", "mvcalc"]);
  } finally { await server.close(); }
});
