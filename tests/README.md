# Tests

Run everything with `npm test`. The suite is split by responsibility:

- `unit/` tests pure application and authoring helpers. Node runs these files in parallel.
- `integration/` tests the build boundary, authoring tools, plugin generation, backend handlers, and template workflow. They run serially because some use temporary workspace fixtures.
- `browser/` tests the built application in Chromium. `app.test.mjs` is a small runner; its feature modules live in `browser/features/`.
- `helpers/` contains test-only HTTP, database, and route helpers.

Useful narrower commands are `npm run test:unit`, `npm run test:integration`, and `npm run test:browser`. Course content is a runtime input, so `npm test` reads only `demo` and `_template`. Validate a user course explicitly with `npm run validate -- <course-id>`.

The project uses Node's built-in test runner for isolated ESM test files and Playwright for browser behavior. A second unit-test framework would duplicate Node's assertion, process isolation, filtering, and watch support without improving this plain-JavaScript stack.
