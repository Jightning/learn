// Synthetic extraction fixture, not a claim of PowerPoint application compatibility.
import { zipSync, strToU8 } from 'fflate';
export function slideFixture() {
  const paragraph = text => `<a:p><a:r><a:t>${text}</a:t></a:r></a:p>`;
  return zipSync(Object.fromEntries(Object.entries({
    'ppt/presentation.xml': '<p:presentation><p:sldIdLst><p:sldId r:id="s1"/><p:sldId r:id="s2"/></p:sldIdLst></p:presentation>',
    'ppt/_rels/presentation.xml.rels': '<Relationships><Relationship Id="s1" Type="slide" Target="slides/slide1.xml"/><Relationship Id="s2" Type="slide" Target="slides/slide2.xml"/></Relationships>',
    'ppt/slides/slide1.xml': `<p:sld>${paragraph('target → comparator → heater → room → sensor → comparator')}</p:sld>`,
    'ppt/slides/slide2.xml': `<p:sld>${paragraph('error = target minus measured temperature; positive error turns heater on.')}</p:sld>`,
    'ppt/slides/_rels/slide2.xml.rels': '<Relationships><Relationship Id="n" Type="notesSlide" Target="../notesSlides/notesSlide2.xml"/></Relationships>',
    'ppt/notesSlides/notesSlide2.xml': `<p:notes>${paragraph('Measurement can lag behind current room temperature. No quantitative model or guarantee of oscillation is supplied.')}</p:notes>`
  }).map(([name, text]) => [name, strToU8(text)])));
}
