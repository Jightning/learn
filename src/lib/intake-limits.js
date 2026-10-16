/* The same limits and wording apply to reader files in folders, streamed ZIP
   output, and parsed JSON maps. Authoring sources are excluded from intake. */
export const MAX_BYTES = 8 * 1024 * 1024;
export const MAX_FILES = 500;
export const MAX_ENTRY = 2 * 1024 * 1024;

export const kb = n => `${(n / 1024).toFixed(0)}KB`;
export const tooManyFiles = count => `too many files (${count}); the limit is ${MAX_FILES}`;
export const oversizedEntry = path => `entry "${path}" is larger than ${kb(MAX_ENTRY)}`;
export const oversizedCourse = total => `that course is ${kb(total)}; the limit is ${kb(MAX_BYTES)}`;
