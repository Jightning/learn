import { testCourseShell } from "./course-shell.mjs";
import { testLearning } from "./learning.mjs";
import { testDiscovery } from "./discovery.mjs";
import { testPracticeAndNotes } from "./practice-notes.mjs";

export async function testCourses(ctx) {
  for (const cid of ctx.ids) {
    const state = await testCourseShell(ctx, cid);
    await testLearning(ctx, state);
    await testDiscovery(ctx, state);
    await testPracticeAndNotes(ctx, state);
  }
}
