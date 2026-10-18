import { questionHelpHref } from '../lib/questions.js';

export default function LearningGuidance({ help, item, ctx }) {
  const anchors = help?.teach || (help?.help ? [help.help] : []);
  if (!help?.message && !anchors.length) return null;
  return <aside class="pcfg" aria-label="Learning guidance">
    {help.message && <p>{help.message}</p>}
    {anchors.map(anchor => <a key={anchor} class="dbtn ghost" href={questionHelpHref(ctx.cid, { ...item, help: anchor }, ctx.idx)}>
      Review {ctx.idx.SUBS[anchor]?.sub.title || 'the relevant lesson'}
    </a>)}
  </aside>;
}
