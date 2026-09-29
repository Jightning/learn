import { M } from "../lib/math.js";
import { safeMarkup } from "../lib/safe-markup.js";

/* Course-authored inline HTML, including the existing <m> maths shorthand. */
export default function Inline({ text }) {
  return <span dangerouslySetInnerHTML={{ __html: safeMarkup(M(text)) }} />;
}
