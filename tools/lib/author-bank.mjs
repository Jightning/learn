/* Canonical bank bookkeeping for author packets. No model maintains a second
   inventory; review warnings are leads, never independence certificates. */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFile } from './load.mjs';

export function readAuthorBank(dir) {
  const root = join(dir, 'questions');
  const records = { types: [], items: [], assessments: [] };
  for (const name of existsSync(root) ? readdirSync(root).filter(n => /\.(yaml|yml|json)$/.test(n) && !/^aliases\./.test(n)).sort() : []) {
    const key = /^types\./.test(name) ? 'types' : /^assessment\./.test(name) ? 'assessments' : 'items';
    const file = join(root, name), data = parseFile(file);
    if (!Array.isArray(data)) throw new Error(`${file}: expected a sequence`);
    records[key].push(...data.map((content, position) => ({ content, file, position: position + 1 })));
  }
  return records;
}

export function resolveAuthorQuiz(dir, unit, bank = readAuthorBank(dir)) {
  const types = new Map(bank.types.map(r => [r.content.id, r.content]));
  const items = new Map(bank.items.map(r => [r.content.id, r.content]));
  return { ...unit, quiz: (unit.quiz || []).map(value => {
    if (typeof value !== 'string') return value;
    const item = items.get(value);
    if (!item) throw new Error(`unknown bank question ${value}`);
    const type = types.get(item.typeId);
    if (!type) throw new Error(`${value}: unknown type ${item.typeId}`);
    return { ...type, ...item, type: type.id, authorId: item.id };
  }) };
}

export function bankMatrix(bank, families = [], placements = []) {
  const rows = bank.types.map(({ content: type }) => {
    const items = bank.items.filter(r => r.content.typeId === type.id).map(r => r.content);
    const practice = items.filter(q => !q.use || q.use === 'practice');
    const checks = items.filter(q => q.use === 'check');
    const warnings = [];
    const lessonChecks = placements.filter(p => p.quiz.some(id => practice.some(q => q.id === id))).map(p => p.sub);
    const teach = type.teach?.length ? type.teach : lessonChecks;
    for (const anchor of teach) if (/^s\d+-\d+$/.test(anchor) && !lessonChecks.includes(anchor)) warnings.push(`missing lesson check at ${anchor}`);
    if (!practice.length) warnings.push('no ordinary practice');
    if (type.assess !== false && !checks.length) warnings.push('no reserved fresh check');
    if (type.assess !== false && items.length < 3) warnings.push('thin inventory; judge sufficiency, do not pad');
    const groups = [...new Set(items.map(q => q.group || 'default'))];
    if (type.assess !== false && groups.length < 2) warnings.push('transfer diversity unproven');
    const prompts = new Map();
    for (const item of items) {
      const normalized = String(item.q || '').toLowerCase().replace(/\d+(?:\.\d+)?/g, '#').replace(/\s+/g, ' ').trim();
      if (!normalized) continue;
      if (prompts.has(normalized)) warnings.push(`suspected template duplicate ${prompts.get(normalized)},${item.id}`);
      else prompts.set(normalized, item.id);
    }
    return { type: type.id, teach, lessonChecks, practice: practice.map(q => q.id), check: checks.map(q => q.id),
      diagnostic: items.filter(q => q.use === 'diagnostic').map(q => q.id), groups, ...(warnings.length ? { warnings } : {}) };
  });
  const represented = new Set(bank.types.flatMap(r => r.content.families || []));
  return { rows, missingFamilies: families.filter(f => !['excluded', 'moved', 'prerequisite'].includes(f.disposition) && !represented.has(f.id)).map(f => f.id) };
}
