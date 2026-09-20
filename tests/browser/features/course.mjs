import { testCourseShell } from "./course-shell.mjs";
import { testLearning } from "./learning.mjs";
import { testDiscovery } from "./discovery.mjs";
import { testPracticeAndNotes } from "./practice-notes.mjs";

export async function testCourses(ctx) {
  for (const cid of ctx.ids) {
    const state = await ctx.run(`${cid}: course shell`, () => testCourseShell(ctx, cid));
    await ctx.run(`${cid}: learning`, () => testLearning(ctx, state));
    await ctx.run(`${cid}: discovery`, () => testDiscovery(ctx, state));
    await ctx.run(`${cid}: practice and notes`, () => testPracticeAndNotes(ctx, state));
  }
}
