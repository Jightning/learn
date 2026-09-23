import { checkFigure } from "./figures.mjs";

/** Validate the data a slide component reads, including each nested visual. */
export function checkSlides(b, where, errs) {
  if (!Array.isArray(b.frames) || !b.frames.length) {
    errs.push(`${where}: slides needs at least one frame`);
    return;
  }
  for (const [i, frame] of b.frames.entries()) {
    const at = `${where}: slide ${i + 1}`;
    if (!frame || typeof frame !== "object" || Array.isArray(frame)) {
      errs.push(`${at} must be a mapping`); continue;
    }
    for (const key of Object.keys(frame))
      if (!["title", "text", "figure", "image"].includes(key)) errs.push(`${at}: unknown key "${key}"`);
    if (!frame.title && !frame.text && !frame.figure && !frame.image)
      errs.push(`${at} is empty`);
    if (frame.figure && frame.image) errs.push(`${at} can have one visual, figure or image`);
    if (frame.figure) {
      if (typeof frame.figure !== "object" || Array.isArray(frame.figure))
        errs.push(`${at}: figure must be a mapping`);
      else {
        for (const key of Object.keys(frame.figure))
          if (!["kind", "spec"].includes(key)) errs.push(`${at}: figure has unknown key "${key}"`);
        checkFigure({ t: "figure", ...frame.figure }, at, errs);
      }
    }
    if (frame.image) {
      if (typeof frame.image !== "object" || Array.isArray(frame.image))
        errs.push(`${at}: image must be a mapping`);
      else {
        for (const key of Object.keys(frame.image))
          if (!["src", "alt"].includes(key)) errs.push(`${at}: image has unknown key "${key}"`);
        if (!String(frame.image.src || "").trim()) errs.push(`${at}: image has no src`);
        if (!String(frame.image.alt || "").trim()) errs.push(`${at}: image has no alt text`);
      }
    }
  }
}
