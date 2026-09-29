import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../src/lib/store.js"));

test("failed IndexedDB flush blocks purge, then recovery cannot replay purged rows", async () => {
  const server = createServer((req, res) => {
    res.setHeader("content-type", req.url === "/store.js" ? "text/javascript" : "text/html");
    res.end(req.url === "/store.js" ? source : "<!doctype html><title>storage test</title>");
  });
  await new Promise(resolve => server.listen(0, resolve));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${server.address().port}/`);
    const result = await page.evaluate(async () => {
      const store = await import("/store.js");
      await store.init();
      const errors = [];
      store.onError(e => errors.push(e.message));
      const originalTransaction = IDBDatabase.prototype.transaction;
      let abortWrite = true;
      IDBDatabase.prototype.transaction = function (names, mode, ...rest) {
        const tx = originalTransaction.call(this, names, mode, ...rest);
        if (abortWrite && mode === "readwrite") {
          abortWrite = false;
          queueMicrotask(() => tx.abort());
        }
        return tx;
      };
      store.appendRow({ id: "a:1", course: "a", ts: 1 });
      store.appendRow({ id: "b:1", course: "b", ts: 2 });
      let rejected = false;
      try { await store.dropRows(r => r.course === "a"); }
      catch { rejected = true; }
      const before = store.logRows().map(r => r.id);
      const disk = () => new Promise((resolve, reject) => {
        const tx = originalTransaction.call(window.__db, "log");
        const get = tx.objectStore("log").getAll();
        get.onsuccess = () => resolve(get.result.map(r => r.id));
        get.onerror = () => reject(get.error);
      });
      const opened = await new Promise((resolve, reject) => {
        const request = indexedDB.open("learn");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      window.__db = opened;
      const failedDisk = await disk();

      const originalDelete = IDBObjectStore.prototype.delete;
      let addedDuringDelete = false;
      IDBObjectStore.prototype.delete = function (key) {
        const request = originalDelete.call(this, key);
        if (!addedDuringDelete && key === "a:1") {
          addedDuringDelete = true;
          store.appendRow({ id: "a:late", course: "a", ts: 3 });
          store.flush().catch(() => {});
        }
        return request;
      };
      const removed = await store.dropRows(r => r.course === "a");
      await store.flush();
      const after = store.logRows().map(r => r.id);
      const recoveredDisk = await disk();
      IDBObjectStore.prototype.delete = originalDelete;
      IDBDatabase.prototype.transaction = originalTransaction;
      opened.close();
      return { rejected, errors: errors.length, before, failedDisk, removed, after, recoveredDisk };
    });
    assert.equal(result.rejected, true);
    assert.equal(result.errors, 1);
    assert.deepEqual(result.before, ["a:1", "b:1"]);
    assert.deepEqual(result.failedDisk, []);
    assert.equal(result.removed, 1);
    assert.deepEqual(result.after, ["b:1"]);
    assert.deepEqual(result.recoveredDisk, ["b:1"]);
    await page.reload();
    assert.deepEqual(await page.evaluate(async () => {
      const store = await import("/store.js");
      await store.init();
      return store.logRows().map(r => r.id);
    }), ["b:1"]);
  } finally {
    await browser.close();
    server.close();
  }
});
