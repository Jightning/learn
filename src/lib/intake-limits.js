/* The same limits and wording apply before reading an archive or folder and
   after parsing a packed JSON map. ZIP sizes are uncompressed byte counts. */
export const MAX_BYTES = 8 * 1024 * 1024;
export const MAX_FILES = 500;
export const MAX_ENTRY = 2 * 1024 * 1024;

export const kb = n => `${(n / 1024).toFixed(0)}KB`;
export const tooManyFiles = count => `too many files (${count}); the limit is ${MAX_FILES}`;
export const oversizedEntry = path => `entry "${path}" is larger than ${kb(MAX_ENTRY)}`;
export const oversizedCourse = total => `that course is ${kb(total)}; the limit is ${kb(MAX_BYTES)}`;
