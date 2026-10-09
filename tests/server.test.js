import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
test('serves UI and reports missing extraction credentials without exposing secrets',async()=>{
 const env={...process.env,PORT:'3099'};delete env.FINANCE_AI_KEY;delete env.OPENAI_API_KEY;
 const server=spawn(process.execPath,['server.js'],{env,stdio:['ignore','pipe','pipe']});
 try {
  await once(server.stdout,'data');
  const page=await fetch('http://localhost:3099');assert.equal(page.status,200);assert.match(await page.text(),/Your money, in focus/);
  for(const path of ['/app.js','/style.css'])assert.equal((await fetch('http://localhost:3099'+path)).status,200);
  assert.equal((await fetch('http://localhost:3099/missing')).status,404);
  const extraction=await fetch('http://localhost:3099/api/extract',{method:'POST',headers:{'Content-Type':'application/pdf'},body:'test'});assert.equal(extraction.status,503);assert.match((await extraction.json()).error,/FINANCE_AI_KEY/);
 }finally{server.kill();await once(server,'exit');}
});
