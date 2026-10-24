/* CREATE TABLE IF NOT EXISTS cannot upgrade an installed backup database.
 * Check once per binding/isolate, before any protocol-2 queries use prefs.rev. */
const ready = new WeakMap();

export function ensureSyncSchema(db) {
  if (!ready.has(db)) {
    const upgrade = async () => {
      const columns = await db.prepare('PRAGMA table_info(prefs)').all();
      if (!columns.results?.length)
        throw new Error('Backup database is not initialized. Run npm run backend:init.');
      if (columns.results.some(c => c.name === 'rev')) return;
      try {
        await db.prepare("ALTER TABLE prefs ADD COLUMN rev TEXT NOT NULL DEFAULT ''").run();
      } catch (error) {
        // Another isolate may have upgraded it while this request was waiting.
        const current = await db.prepare('PRAGMA table_info(prefs)').all();
        if (!current.results?.some(c => c.name === 'rev')) throw error;
      }
    };
    ready.set(db, upgrade().catch(error => { ready.delete(db); throw error; }));
  }
  return ready.get(db);
}
