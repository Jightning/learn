import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serveDist } from '../helpers/browser-harness.mjs';
const files = {
  'course.yaml': 'code: TEST\nstate: {enabled: true}\nconcepts: {c: {term: Concept, body: Explanation}}',
  'sections/01-one/1-lesson.yaml': 'title: Lesson\nblocks: []\nquiz: [a]',
  'sections/01-one/2-other.yaml': 'title: Other\nblocks: []\nquiz: []',
  'categorize/objectives.yaml': '- {id: o, title: Outcome}',
  'categorize/families.yaml': '- {id: f, title: Family}',
  'questions/types.json': JSON.stringify([{id:'t',task:'Solve numbers',concept:'c',objectives:['o'],families:['f']}]),
  'questions/bank.json': JSON.stringify(['a','b','fresh'].map((id,i)=>({id,typeId:'t',q:`Compute item ${id}.`,why:'Model explanation.',verified:true,tries:2,
    response:{kind:'number',value:i+1},...(id==='fresh'?{use:'check',group:'changed'}:{})}))),
  'questions/assessment.json': JSON.stringify([{scope:'course',criteria:'Solve independently.'},{scope:'s1',criteria:'Solve independently.'}])
};
const logRows = page => page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('learn');r.onsuccess=()=>{
  const db=r.result,q=db.transaction('log').objectStore('log').getAll();q.onsuccess=()=>{db.close();resolve(q.result)};};}));
test('stable lesson attempt, reload retry, scoped mixed bank and delayed check feedback',async()=>{
  const server=await serveDist('.'), browser=await chromium.launch();
  try {
    const page=await browser.newPage();page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/courses/demo.json',r=>r.fulfill({json:files}));
    await page.goto(server.origin+'/#/demo/s1-1');
    let card=page.locator('.q:visible');await card.locator('input[type=number]').fill('9');
    await card.getByRole('button',{name:/^Check answer/}).click();await card.getByRole('button',{name:/Try again/}).waitFor();
    await page.reload();await card.getByRole('button',{name:/Try again/}).click();
    await card.locator('input[type=number]').fill('1');await card.getByRole('button',{name:/^Check answer/}).click();
    await card.locator('.qresult').filter({hasText:'Correct'}).waitFor();
    await page.goto(server.origin+'/#/demo/review/mixed');
    await page.getByRole('button',{name:/^Start .*questions/}).click();
    assert.equal(await page.locator('.q[data-qid=fresh]').count(),0);
    await page.getByRole('button',{name:'Finish session',exact:true}).click();await page.getByRole('button',{name:'Another set'}).click();
    await page.getByText('Readiness check',{exact:true}).click();
    await page.getByRole('button',{name:'Confirm this standard applies to my goal'}).click();
    await page.getByRole('button',{name:'Start fresh check'}).click();card=page.locator('.q:visible');
    assert.equal(await card.getAttribute('data-qid'),'fresh');assert.equal(await card.locator('.qtype,.qreason').count(),0);
    await card.locator('input[type=number]').fill('3');await card.getByRole('button',{name:/Check answer/}).click();
    await card.getByText('Response saved').waitFor();assert.equal(await card.locator('.ans,.qexplain,.is-right').count(),0);
    await page.reload();await card.getByText('Response saved').waitFor();
    await card.getByRole('button',{name:/Continue/}).click();await page.getByText('Check complete').waitFor();
    await page.getByText('Answer and feedback',{exact:true}).click();await page.getByText('Model explanation.',{exact:true}).waitFor();
    const rows=await logRows(page);const attempt=rows.find(r=>r.event==='attempt'&&r.itemId==='a');
    assert.equal(attempt.firstUnaided,false);assert.equal(attempt.correct,true);assert.equal(attempt.triesUsed,2);
    assert.equal(rows.filter(r=>r.event==='attempt'&&r.itemId==='fresh').length,1);
    assert.ok(rows.some(r=>r.event==='exposure'&&r.itemId==='fresh'));assert.deepEqual(errors,[]);
  } finally {await browser.close();server.close();}
});
test('self rubric check stores first response before revealing model and grades after the block',async()=>{
  const server=await serveDist('.'),browser=await chromium.launch();
  try {
    const page=await browser.newPage();page.setDefaultTimeout(7000);
    const taskFiles={...files};const bank=JSON.parse(taskFiles['questions/bank.json']);
    bank.find(q=>q.id==='fresh').response={kind:'self',model:'Compare the stated reasoning with this rubric.'};
    taskFiles['questions/bank.json']=JSON.stringify(bank);
    await page.route('**/courses/demo.json',r=>r.fulfill({json:taskFiles}));await page.goto(server.origin+'/#/demo/review/mixed');
    await page.getByText('Readiness check',{exact:true}).click();await page.getByRole('button',{name:'Confirm this standard applies to my goal'}).click();
    await page.getByRole('button',{name:'Start fresh check'}).click();const card=page.locator('.q:visible');
    await card.locator('textarea').fill('My independently written reasoning.');await card.getByRole('button',{name:/Check answer/}).click();
    await card.getByText('Response saved').waitFor();assert.equal(await card.locator('.ans').count(),0);
    await card.getByRole('button',{name:/Continue/}).click();await page.getByText('Answer and feedback',{exact:true}).click();
    await page.getByText('Compare the stated reasoning with this rubric.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Correct',exact:true}).click();await page.locator('.qresult').filter({hasText:'Correct'}).waitFor();
    const rows=await logRows(page);assert.equal(rows.filter(r=>r.event==='attempt'&&r.itemId==='fresh').length,1);
    assert.equal(rows.filter(r=>r.event==='rubric-score').length,1);
  } finally {await browser.close();server.close();}
});
