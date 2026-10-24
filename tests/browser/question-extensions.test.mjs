import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {serveDist} from '../helpers/browser-harness.mjs';
const fixture = (questions, assessments=[]) => ({
 'course.yaml':'code: QUESTION\nstate: {enabled: true}\nconcepts: {c: {term: Logic, body: Logic tasks}}',
 'sections/01-one/1-lesson.yaml':`title: Logic\nblocks: []\nquiz: ${JSON.stringify(questions.filter(q=>!q.use || q.use==='practice').map(q=>q.id))}`,
 'categorize/objectives.yaml':'- {id: o, title: Logic, families: [f]}',
 'categorize/families.yaml':'- {id: f, title: Logic, concept: c, teach: [s1-1]}',
 'questions/skills.json':JSON.stringify([{id:'logic',task:'Recall logic',standard:'Recall independently',family:'f'}]),
 'questions/bank.json':JSON.stringify(questions.map(q=>({skills:['logic'],...q}))),
 'questions/assessment.json':JSON.stringify(assessments)
});
const rows=page=>page.evaluate(()=>new Promise(resolve=>{
 const req=indexedDB.open('learn');req.onsuccess=()=>{const db=req.result;const q=db.transaction('log').objectStore('log').getAll();q.onsuccess=()=>{resolve(q.result);db.close();};};
}));
const installSlowFormulaWorker = page => page.addInitScript(()=>{
   const NativeWorker=window.Worker;
   window.Worker=class {
    constructor(url,options){
     if (!String(url).includes('formula-worker')) return new NativeWorker(url,options);
     window.__formulaWorkerStarted=Date.now();
    }
    postMessage(){this.timer=setTimeout(()=>this.onmessage?.({data:{result:true}}),1500);}
    terminate(){clearTimeout(this.timer);}
   };
  });
for (const width of [1440,390]) test(`checked text, blanks, partial points and retry provenance at ${width}px`,async()=>{
 const server=await serveDist('.'),browser=await chromium.launch();
 try {
  const page=await browser.newPage({viewport:{width,height:1000}});page.setDefaultTimeout(6000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const questions=[
   {id:'text',q:'Name the gate.',tries:2,response:{kind:'text',accepted:['NAND'],normalization:{trim:true,caseSensitive:false}},errors:[{id:'and',description:'Check inversion',match:{kind:'text',accepted:['AND']}}]},
   {id:'blanks',q:'Give index and level.',response:{kind:'blanks',fields:[{id:'index',label:'Selected index',response:{kind:'number',value:5}},{id:'level',label:'Asserted level',response:{kind:'text',accepted:['low']}}]}},
   {id:'self',q:'Explain your reasoning.',response:{kind:'self',model:'A reasoned explanation.'}}
  ];
  await page.route('**/courses/demo.json',r=>r.fulfill({json:fixture(questions)}));
  await page.goto(server.origin+'/#/demo/s1-1');
  const card=()=>page.locator('.quiz .q:visible');
  await card().getByLabel('Your answer',{exact:true}).fill('AND');
  await card().getByRole('button',{name:'Check answer',exact:true}).click();
  await card().getByText('Wrong',{exact:true}).waitFor();
  await page.reload();
  await card().getByLabel('Your answer',{exact:true}).fill(' nand ');
  await card().getByRole('button',{name:'Check answer',exact:true}).click();
  await card().getByText('Correct',{exact:true}).waitFor();
  await card().getByText('Checked against answer rules',{exact:false}).waitFor();
  let attempts=(await rows(page)).filter(r=>r.event==='attempt');
  assert.equal(attempts[0].firstUnaided,false);assert.equal(attempts[0].triesUsed,2);
  assert.deepEqual(attempts[0].errorHypotheses,['and']);
  assert.equal(attempts[0].gradeSource,'deterministic-checker');
  await page.getByRole('button',{name:'Next question',exact:true}).click();
  await card().getByLabel('Selected index',{exact:true}).fill('5');
  await card().getByLabel('Asserted level',{exact:true}).fill('high');
  await card().getByRole('button',{name:'Check answer',exact:true}).click();
  await card().getByText('Wrong',{exact:true}).waitFor();
  attempts=(await rows(page)).filter(r=>r.event==='attempt');
  const partial=attempts.find(r=>r.itemId==='blanks');
  assert.equal(partial.score,1);assert.equal(partial.maxScore,2);
  assert.deepEqual(partial.criteria.map(c=>c.correct),[true,false]);
  assert.equal(partial.firstUnaided,false);
  await page.getByRole('button',{name:'Next question',exact:true}).click();
  await card().getByLabel('Your answer',{exact:true}).fill('My reasoning');
  await card().getByRole('button',{name:'Check answer',exact:true}).click();
  await card().getByRole('button',{name:'Correct',exact:true}).click();
  await card().getByText('Self-reported',{exact:false}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
 } finally {await browser.close();server.close();}
});
test('question deadline starts explicitly, survives reload and completes only once on expiry',async()=>{
 const server=await serveDist('.'),browser=await chromium.launch();
 try {
  const page=await browser.newPage();page.setDefaultTimeout(6000);
  await page.route('**/courses/demo.json',r=>r.fulfill({json:fixture([
   {id:'timed',q:'Supply the gate.',timing:{limitSeconds:1},response:{kind:'text',accepted:['NAND']}},
   {id:'later',q:'Not visible yet.',timing:{limitSeconds:1},response:{kind:'number',value:1}}
  ])}));
  await page.goto(server.origin+'/#/demo/s1-1');
  const card=page.locator('[data-qid=timed]');
  await card.getByRole('button',{name:'Start timed question',exact:true}).click();
  await card.getByRole('timer').waitFor();
  await page.reload();
  await card.getByText('Time expired',{exact:true}).waitFor();
  await page.reload();await card.getByText('Time expired',{exact:true}).waitFor();
  const attempts=(await rows(page)).filter(r=>r.event==='attempt');
  assert.equal(attempts.length,1);assert.equal(attempts[0].timedOut,true);
  assert.equal(attempts[0].firstUnaided,null);
  await page.getByRole('button',{name:'Next question',exact:true}).click();
  await page.locator('[data-qid=later]').getByRole('button',{name:'Start timed question',exact:true}).waitFor();
 } finally {await browser.close();server.close();}
});
test('assessment total expiry leaves unreached tasks unobserved and unavailable for late answers',async()=>{
 const server=await serveDist('.'),browser=await chromium.launch();
 try {
  const page=await browser.newPage();page.setDefaultTimeout(6000);
  await page.route('**/courses/demo.json',r=>r.fulfill({json:fixture([
   {id:'ordinary',q:'Practice.',group:'ordinary',response:{kind:'number',value:1}},
   ...[1,2].map(n=>({id:`check${n}`,use:'check',group:`check${n}`,q:`Check ${n}`,response:{kind:'number',value:1}}))
  ],[{scope:'course',criteria:'Recall independently',timing:{limitSeconds:1}}])}));
  await page.goto(server.origin+'/#/demo/review/mixed');
  await page.getByText('Readiness check',{exact:true}).click();
  await page.getByRole('button',{name:'Start fresh check',exact:true}).click();
  await page.getByText('Time limit reached. Unreached questions remain unobserved.',{exact:true}).waitFor();
  const events=await rows(page),attempts=events.filter(r=>r.event==='attempt');
  assert.equal(attempts.length,1);assert.equal(attempts[0].timedOut,true);
  const end=events.find(r=>r.event==='assessment-finish');
  assert.equal(end.unreached.length,1);
  assert.equal(await page.locator(`[data-qid="${end.unreached[0]}"]`).count(),0);
 } finally {await browser.close();server.close();}
});

test('a stepped task shares its parent deadline across reload without attempting future steps',async()=>{
 const server=await serveDist('.'),browser=await chromium.launch();
 try {
  const page=await browser.newPage();page.setDefaultTimeout(6000);
  await page.route('**/courses/demo.json',r=>r.fulfill({json:fixture([
   {id:'chain',q:'Complete the reasoning chain.',timing:{limitSeconds:2},response:{kind:'number',value:3},
    steps:[1,2,3].map(n=>({id:`s${n}`,skills:['logic'],q:`Part ${n}`,response:{kind:'number',value:n}}))}
  ])}));
  await page.goto(server.origin+'/#/demo/s1-1');
  await page.getByRole('button',{name:'Start timed question',exact:true}).click();
  const first=page.locator('[data-qid="chain:step:s1"]');
  await first.getByRole('timer').waitFor();
  await first.getByLabel('Your answer',{exact:true}).fill('1');
  await first.getByRole('button',{name:'Check answer',exact:true}).click();
  await first.getByRole('button',{name:/Continue/}).click();
  await page.getByText('Step 2 of 3',{exact:true}).waitFor();
  await page.reload();
  await page.locator('[data-qid=chain]').getByText('Time expired',{exact:true}).waitFor();
  const attempts=(await rows(page)).filter(r=>r.event==='attempt');
  assert.equal(attempts.filter(r=>r.itemId==='chain').length,1);
  assert.equal(attempts.some(r=>r.stepId==='s3'),false);
  assert.equal(attempts.find(r=>r.stepId==='s2')?.timedOut,true,'the displayed unanswered step is recorded before the parent closes');
  assert.equal(attempts.find(r=>r.itemId==='chain').timedOut,true);
 } finally {await browser.close();server.close();}
});

test('self-reported review scheduling preserves its source live and after replay',async()=>{
 const server=await serveDist('.'),browser=await chromium.launch();
 try {
  const page=await browser.newPage();page.setDefaultTimeout(6000);
  await page.route('**/courses/demo.json',r=>r.fulfill({json:fixture([
   {id:'self-only',q:'Explain the reasoning.',response:{kind:'self',model:'A complete explanation.'}}
  ])}));
  await page.goto(server.origin+'/#/demo/s1-1');
  const card=page.locator('[data-qid=self-only]');
  await card.getByLabel('Your answer',{exact:true}).fill('My reasoning');
  await card.getByRole('button',{name:'Check answer',exact:true}).click();
  await card.getByRole('button',{name:'Correct',exact:true}).click();
  await card.getByText('Self-reported',{exact:false}).waitFor();
  const memory=()=>page.evaluate(()=>new Promise(resolve=>{
   const req=indexedDB.open('learn');req.onsuccess=()=>{const db=req.result;const q=db.transaction('kv').objectStore('kv').get('retain:v1');q.onsuccess=()=>{resolve(JSON.parse(q.result));db.close();};};
  }));
  assert.equal((await memory()).demo['type:logic'].selfReportedReps,1);
  assert.equal((await memory()).demo['type:logic'].checkedReps,0);
  await page.reload();await card.getByText('Self-reported',{exact:false}).waitFor();
  assert.equal((await memory()).demo['type:logic'].selfReportedReps,1);
  assert.equal((await memory()).demo['type:logic'].checkedReps,0);
 } finally {await browser.close();server.close();}
});

test('an on-time formula commit survives reload and late checking without inflating response time',async()=>{
 const server=await serveDist('.'),browser=await chromium.launch();
 try {
  const page=await browser.newPage();page.setDefaultTimeout(7000);
  await installSlowFormulaWorker(page);
  await page.route('**/courses/demo.json',r=>r.fulfill({json:fixture([
   {id:'formula-timed',q:'Enter x squared.',timing:{limitSeconds:1},response:{kind:'formula',answer:'x^2',variables:['x']}}
  ])}));
  await page.goto(server.origin+'/#/demo/s1-1');
  const card=page.locator('[data-qid=formula-timed]');
  await card.locator('math-field').waitFor();
  await card.getByRole('button',{name:'Start timed question',exact:true}).click();
  await card.getByRole('timer').waitFor();
  await card.locator('math-field').evaluate(el=>{el.setValue('x^2',{format:'ascii-math'});el.dispatchEvent(new Event('input',{bubbles:true}));});
  await card.getByRole('button',{name:'Check answer',exact:true}).click();
  await page.waitForFunction(()=>window.__formulaWorkerStarted);
  const original=await page.evaluate(()=>window.__formulaWorkerStarted);
  await page.reload();
  await card.getByText('Correct',{exact:true}).waitFor();
  const attempts=(await rows(page)).filter(r=>r.event==='attempt');
  assert.equal(attempts.length,1);
  assert.equal(attempts[0].firstUnaided,true);assert.equal(attempts[0].timedOut,false);
  assert.ok(attempts[0].submittedAt<=original);
  assert.ok(attempts[0].activeMs<1000,'checker wait is excluded from learner response time');
  await page.reload();await card.getByText('Correct',{exact:true}).waitFor();
  assert.equal((await rows(page)).filter(r=>r.event==='attempt').length,1);
 } finally {await browser.close();server.close();}
});

test('a parent deadline waits for an on-time formula step before closing the chain',async()=>{
 const server=await serveDist('.'),browser=await chromium.launch();
 try {
  const page=await browser.newPage();page.setDefaultTimeout(7000);
  await installSlowFormulaWorker(page);
  await page.route('**/courses/demo.json',r=>r.fulfill({json:fixture([
   {id:'formula-chain',q:'Complete the chain.',timing:{limitSeconds:1},response:{kind:'number',value:2},steps:[
    {id:'formula',skills:['logic'],q:'Enter x squared.',response:{kind:'formula',answer:'x^2',variables:['x']}},
    {id:'unreached',skills:['logic'],q:'Next part.',response:{kind:'number',value:2}}
   ]}
  ])}));
  await page.goto(server.origin+'/#/demo/s1-1');
  await page.getByRole('button',{name:'Start timed question',exact:true}).click();
  const child=page.locator('[data-qid="formula-chain:step:formula"]');
  await child.locator('math-field').waitFor();
  await child.locator('math-field').evaluate(el=>{el.setValue('x^2',{format:'ascii-math'});el.dispatchEvent(new Event('input',{bubbles:true}));});
  await child.getByRole('button',{name:'Check answer',exact:true}).click();
  await page.waitForFunction(()=>window.__formulaWorkerStarted);
  await page.locator('[data-qid=formula-chain]').getByText('Time expired',{exact:true}).waitFor();
  const attempts=(await rows(page)).filter(r=>r.event==='attempt');
  assert.equal(attempts.find(r=>r.stepId==='formula')?.firstUnaided,true);
  assert.equal(attempts.find(r=>r.itemId==='formula-chain')?.timedOut,true);
  assert.equal(attempts.some(r=>r.stepId==='unreached'),false);
 } finally {await browser.close();server.close();}
});
