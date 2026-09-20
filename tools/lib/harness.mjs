/* ============================================================================
 * tools/lib/harness.mjs — put the built app in front of a browser
 *
 * Two things every browser-driving tool now needs, and neither is obvious.
 *
 * Courses are fetched at runtime, so the page needs an origin: `file://` cannot
 * fetch. A synthetic demo-derived import exercises the multi-course user path
 * without making engine tests depend on private course content.
 * ==========================================================================*/
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { courseFiles } from "./files.mjs";

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".webmanifest": "application/manifest+json"
};

/** Serve dist/ on a free port. Returns { origin, close }. */
export async function serveDist(root) {
  const dist = join(root, "dist");
  if (!existsSync(join(dist, "index.html")))
    throw new Error("dist/ not built. run: npm run build");

  const server = createServer((q, res) => {
    const rel = decodeURIComponent((q.url || "/").split("?")[0]);
    /* The static harness serves no Function, so a backup attempt 404s. That is
   not a fault here: the suite runs as a reader with no secret, which is the
   case the client is built to make no request in at all. */
    if (rel.startsWith("/api/")) {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ cursor: 0, more: false, rows: [] }));
    }
    const file = join(dist, rel === "/" ? "index.html" : rel);
    if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404); return res.end();
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(res);
  });

  await new Promise(r => server.listen(0, r));
  return {
    origin: `http://localhost:${server.address().port}`,
    close: () => server.close()
  };
}

/** Install a second course derived entirely from the public demo.
 *
 * Browser tests need more than one shelf item to exercise ordering, removal,
 * and cross-course review. Using packed/ for that made every local user course
 * a dependency of application development, including half-written ones. This
 * fixture keeps the same import path while depending only on shipped source. */
export async function installDemoFixture(page, root) {
  const files = courseFiles(join(root, "courses", "demo"), message => {
    throw new Error(`demo fixture: ${message}`);
  });
  files["course.yaml"] = files["course.yaml"]
    .replace(/^code:.*$/m, "code: DEMO 002")
    .replace(/^title:.*$/m, "title: The Study-Site System — Test Copy")
    .replace(/^(\s*hue:\s*)\d+/m, (_whole, lead) => lead + "35");

  await page.locator("#lib-add").click();
  await page.locator('.modal .cio input[accept*="zip"]').setInputFiles({
    name: "test-copy.course.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(files))
  });
  await page.waitForTimeout(1400);
  return 1;
}
