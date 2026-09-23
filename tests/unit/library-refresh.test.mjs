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

    courses.importCourse(id, withLesson("old"));
    library.refresh();
    assert.equal((await library.get(id)).sections[0].subs[0].blocks[0].h, "old");

    courses.importCourse(id, withLesson("new"));
    library.refresh();
    assert.equal((await library.get(id)).sections[0].subs[0].blocks[0].h, "new");

    courses.removeCourse(id);
    library.refresh();
    assert.equal(library.peek(id), null);

    /* A backup may contain a stale copy of a bundled demo. It must not replace
       the bytes shipped by the current site, or restoring a device hides new
       lessons and visual examples. */
    courses.importCourse("demo", {
      "course.yaml": "code: DEMO\ntitle: Stale restored copy\n",
      "sections/01-old/_section.yaml": "title: Old\n"
    });
    library.refresh();
    assert.notEqual(library.INDEX.demo.title, "Stale restored copy");
    courses.removeCourse("demo");
    library.refresh();
  } finally {
    await server.close();
  }
});
