// SPDX-FileCopyrightText: 2026 Sungmoon Park
// SPDX-License-Identifier: Apache-2.0
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EvidenceLedger}=require('../src/ledger');
function stub(count,bytes=1) {
  let position=0,closed=false;
  return {getStateByRange:async()=>({
    next:async()=>position++<count?{value:{value:Buffer.from(JSON.stringify({text:'x'.repeat(bytes)}))},done:false}:{done:true},
    close:async()=>{closed=true;}
  }),closed:()=>closed};
}
test('1.2 query accepts 500 results and closes iterator',async()=>{
  const s=stub(500),bytes=await new EvidenceLedger().execute(s,null,'ListEvidence',[]);
  assert.equal(JSON.parse(bytes).length,500);assert.equal(s.closed(),true);
});
test('1.2 query rejects 501 results rather than silently truncating',async()=>{
  const s=stub(501);
  await assert.rejects(()=>new EvidenceLedger().execute(s,null,'ListEvidence',[]),/query overflow/);
  assert.equal(s.closed(),true);
});
test('1.2 query rejects response exceeding 4 MiB',async()=>{
  const s=stub(1,4194304);
  await assert.rejects(()=>new EvidenceLedger().execute(s,null,'ListEvidence',[]),/query overflow/);
  assert.equal(s.closed(),true);
});
test('unknown function rejected',async()=>{
  await assert.rejects(()=>new EvidenceLedger().execute({},null,'UnknownWrite',[]),/unknown function/);
});
