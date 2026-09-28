import { M } from "../lib/math.js";

/* Course-authored inline HTML, including the existing <m> maths shorthand. */
export default function Inline({ text }) {
  return <span dangerouslySetInnerHTML={{ __html: M(text) }} />;
}
