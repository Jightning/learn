import { M } from "../lib/math.js";
import { safeMarkup } from "../lib/safe-markup.js";

/* Course-authored Markdown and markup, including the <m> maths shorthand. */
export default function Inline({ text }) {
  return <span dangerouslySetInnerHTML={{ __html: safeMarkup(M(text)) }} />;
}
