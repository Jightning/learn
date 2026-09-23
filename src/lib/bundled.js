/* The built-in course set is supplied by the Vite courses module in the
 * browser. Keep the small bit of shared state here so modules that are also
 * exercised directly by Node (notably cloud backup) do not have to import a
 * Vite-only virtual module. */
let index = Object.create(null);
let ids = new Set();

export function setBundledCourses(nextIndex) {
  index = { ...(nextIndex || {}) };
  ids = new Set(Object.keys(index));
}

export const isBundledCourse = id => ids.has(id);
export const bundledCourseIds = () => [...ids];
export const bundledCourseIndex = () => ({ ...index });
