/* Canonical bank bookkeeping for author packets. No model maintains a second
   inventory; review warnings are leads, never independence certificates. */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadCourse, parseFile } from './load.mjs';
import { skillAuthorContext } from './question-context.mjs';

export function readAuthorBank(dir) {
  const root = join(dir, 'questions');
  const records = { types: [], items: [], assessments: [] };
  const files = (dir, prefix = '') => existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const name = prefix + entry.name;
    return entry.isDirectory() ? files(join(dir, entry.name), name + '/')
      : entry.isFile() && /^[^_][^.]*\.(yaml|yml|json)$/.test(name) && !/^aliases\./.test(name) ? [name] : [];
  }).sort() : [];
  for (const name of files(root)) {
    const key = /^(types|skills)\./.test(name) ? 'types' : /^assessment\./.test(name) ? 'assessments' : 'items';
    const file = join(root, name), data = parseFile(file);
    if (!Array.isArray(data)) throw new Error(`${file}: expected a sequence`);
    records[key].push(...data.map((content, position) => ({ content, file, position: position + 1 })));
  }
  if (records.types.some(r => /[/\\]skills\./.test(r.file))) {
    const { course, errors } = loadCourse(dir);
    const invalid = errors.filter(e => e.startsWith('questions'));
    if (invalid.length) throw new Error(invalid.join('\n'));
    records.blueprints = course.assessmentBlueprints;
    for (const record of records.types) { record.rawContent = record.content; record.content = course.questionTypes[record.content.id] || record.content; }
    for (const record of records.items) { record.rawContent = record.content; record.content = course.questionBank[record.content.id] || record.content; }
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
    const items = bank.items.filter(r => (r.content.skills || [r.content.typeId]).includes(type.id)).map(r => r.content);
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
    return { type: type.id, teach, lessonChecks,
      ...(type.schemaVersion === 2 ? { context: skillAuthorContext(type, items),
        contributions: Object.fromEntries(Object.entries(bank.blueprints || {}).filter(([, b]) => Object.hasOwn(b.typeWeights, type.id)).map(([scope, b]) => [scope, b.typeWeights[type.id]])) } : {}), practice: practice.map(q => q.id), check: checks.map(q => q.id),
      diagnostic: items.filter(q => q.use === 'diagnostic').map(q => q.id), groups, ...(warnings.length ? { warnings } : {}) };
  });
  const represented = new Set(bank.types.flatMap(r => r.content.families || []));
  return { rows, missingFamilies: families.filter(f => !['excluded', 'moved', 'prerequisite'].includes(f.disposition) && !represented.has(f.id)).map(f => f.id) };
}
