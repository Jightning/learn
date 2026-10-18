import { strip, textOf } from "./util.js";
import { blockId } from "./index.js";

/* Only authored reading material belongs here. Question stimuli and solutions
 * remain with their questions; indexing them would reveal answers as help. */
export function courseReferences(C, idx, cid, subId) {
  const sub = idx.SUBS[subId]?.sub;
  const text = textOf(sub?.blocks || []);
  const cited = new Set([...text.matchAll(/<f\s+k="([^"]+)"/g)].map(m => m[1]));
  const concepts = new Set([...text.matchAll(/<c\s+k="([^"]+)"/g)].map(m => m[1]));
  const entries = [];
  for (const section of C.sections || []) for (const lesson of section.subs || []) {
    (lesson.blocks || []).forEach((block, at) => {
      const num = idx.FIG.numOf(block);
      if (!num) return;
      const address = blockId(lesson.id, at);
      entries.push({ id: address, block, num, kind: idx.FIG.kindOf(block),
        title: block.cap || block.alt || lesson.title, lesson: lesson.title,
        local: lesson.id === subId || cited.has(block.id),
        href: `#/${cid}/${address}` });
    });
  }
  for (const [id, concept] of Object.entries(C.concepts || {})) {
    entries.push({ id: `c/${id}`, kind: "Concept", title: concept.term || id,
      body: concept.body || "", local: concepts.has(id), href: `#/${cid}/c/${id}` });
  }
  return entries.sort((a, b) => Number(b.local) - Number(a.local));
}

export function filterReferences(entries, query) {
  const words = strip(query || "").toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter(entry => words.every(word =>
    strip(`${entry.kind} ${entry.num || ""} ${entry.title} ${entry.lesson || ""} ${entry.body || ""}`)
      .toLocaleLowerCase().includes(word)));
}
