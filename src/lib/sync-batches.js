/* Stay below the API's record and body limits, including encryption overhead. */
export function syncBatches(rows, prefs) {
  const batches = [];
  let batch = { rows: [], prefs: [] }, bytes = 0;
  for (const [kind, records] of [["rows", rows], ["prefs", prefs]]) {
    for (const record of records) {
      const size = new TextEncoder().encode(JSON.stringify(record)).length + 1;
      if (size > 3 * 1024 * 1024) throw new Error("a saved value is too large to back up");
      if (batch[kind].length === 2000 || bytes + size > 3 * 1024 * 1024) {
        batches.push(batch); batch = { rows: [], prefs: [] }; bytes = 0;
      }
      batch[kind].push(record); bytes += size;
    }
  }
  batches.push(batch);
  return batches;
}
