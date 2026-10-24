/* IDs remain stable identity. Numeric indexes are derived, never learner data.
 * Shared concepts/families describe related tasks, not transferable mastery. */
export function compileSkillGraph(skills) {
  const ids = Object.keys(skills).sort(), index = Object.fromEntries(ids.map((id, i) => [id, i]));
  const concepts = {}, families = {}, objectives = {};
  const add = (map, key, i) => { (map[key] ||= []).push(i); };
  const requires = ids.map(id => (skills[id].requires || []).map(dep => {
    if (!Object.hasOwn(index, dep)) throw new Error(`Unknown prerequisite ${dep}`);
    return index[dep];
  }));
  ids.forEach((id, i) => {
    const skill = skills[id];
    for (const concept of new Set(skill.concepts || [skill.concept].filter(Boolean))) add(concepts, concept, i);
    for (const family of new Set(skill.families || [])) add(families, family, i);
    for (const objective of new Set(skill.objectives || [])) add(objectives, objective, i);
  });
  return { version: 1, ids, index, requires, concepts, families, objectives };
}

export function relatedSkills(graph, id) {
  const at = graph.index[id];
  if (at === undefined) return [];
  const result = new Map();
  for (const [relation, groups] of Object.entries({ concept: graph.concepts, family: graph.families, objective: graph.objectives }))
    for (const members of Object.values(groups)) if (members.includes(at))
      for (const peer of members) if (peer !== at) {
        if (!result.has(peer)) result.set(peer, []);
        result.get(peer).push(relation);
      }
  return [...result].sort(([a], [b]) => a-b).map(([i, relations]) => ({ id: graph.ids[i], relations: [...new Set(relations)] }));
}
