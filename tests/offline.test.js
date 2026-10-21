import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,stat} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const code=await readFile(new URL('sw.js',root),'utf8');
const currentCache=code.match(/const CACHE='([^']+)'/)[1];
function harness(){
  const handlers={},cacheItems=new Map(),deleted=[],requests=[];let claimed=false,fetches=0;
  const cache={addAll:async rows=>{for(const r of rows){requests.push(r.url);cacheItems.set(r.url,{cached:r.url});}},match:async r=>cacheItems.get(typeof r==='string'?r:r.url??r.href)};
  const context={URL,Request,Set,Promise,caches:{open:async()=>cache,keys:async()=>['other-cache','kochwerk-shell-old',currentCache],delete:async k=>{deleted.push(k);return true;}},fetch:async()=>{fetches++;throw new Error('offline');},self:{location:{href:'https://test.invalid/kochwerk/sw.js'},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{claimed=true;}}}};
  vm.runInNewContext(code,context);
  return {handlers,cacheItems,deleted,requests,get claimed(){return claimed;},get fetches(){return fetches;}};
}
async function lifecycle(fn){let pending;fn({waitUntil:p=>pending=p});await pending;}
test('Offline-Paket enthält alle Dateien und kann vollständig vorab geladen werden',async()=>{
  const h=harness();await lifecycle(h.handlers.install);assert.equal(h.requests.length,12);
  for(const url of h.requests){const relative=new URL(url).pathname.replace('/kochwerk/','')||'index.html';assert.ok((await stat(new URL(relative,root))).size>0);}
});
test('Aktivierung löscht ausschließlich alte Kochwerk-App-Caches',async()=>{
  const h=harness();await lifecycle(h.handlers.activate);assert.deepEqual(h.deleted,['kochwerk-shell-old']);assert.equal(h.claimed,true);
});
test('Offline-Navigation und Module kommen aus dem Cache, ohne Netzwerkzugriff',async()=>{
  const h=harness();await lifecycle(h.handlers.install);
  for(const [url,mode] of [['https://test.invalid/kochwerk/','navigate'],['https://test.invalid/kochwerk/app.js','cors']]){
    let response;h.handlers.fetch({request:{url,method:'GET',mode},respondWith:r=>response=r});assert.ok(await response);
  }assert.equal(h.fetches,0);
});
test('Externe URLs, fremde Pfade und Schreibzugriffe werden nicht abgefangen',()=>{
  const h=harness();for(const request of [{url:'https://other.invalid/app.js',method:'GET'},{url:'https://test.invalid/private.json',method:'GET'},{url:'https://test.invalid/kochwerk/',method:'POST',mode:'navigate'}])h.handlers.fetch({request,respondWith:()=>assert.fail('Unerwartet abgefangen')});
});
test('HTML, CSS und JavaScript enthalten keine externen Runtime-Abhängigkeiten',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8');assert.doesNotMatch(html,/(?:src|href)=["']https?:/);
  for(const file of ['styles.css','app.js','domain.js','storage.js','demo.js','art.js']){
    const source=await readFile(new URL(file,root),'utf8');assert.doesNotMatch(source,/from\s+['"]https?:|url\(['"]?https?:|fetch\(['"]https?:/);
  }
});
