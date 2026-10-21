import test from 'node:test';
import assert from 'node:assert/strict';
import {createCookingMode,createAutomaticCookingMode} from '../cooking-mode.js';

class Sentinel extends EventTarget {
  released=false;releases=0;
  async release(){this.releases++;this.released=true;this.dispatchEvent(new Event('release'));}
}
function fixture(options={}){
  const calls=[],states=[],locks=[];
  const wakeLock={request:async type=>{calls.push(type);const lock=new Sentinel();locks.push(lock);return lock;}};
  const mode=createCookingMode({wakeLock,onChange:s=>states.push(s),...options});
  return {mode,calls,states,locks};
}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}

test('Wachhalten wird nur nach dem Einschalten angefordert und danach wieder beendet',async()=>{
  const {mode,calls,locks}=fixture();assert.equal(mode.state.enabled,false);assert.equal(calls.length,0);
  await mode.enable();assert.deepEqual(calls,['screen']);assert.equal(mode.state.active,true);
  await mode.disable();assert.equal(locks[0].released,true);assert.equal(mode.state.active,false);assert.equal(mode.state.phase,'off');
});
test('Beim Wechsel in den Hintergrund freigeben und bei Rückkehr neu anfordern',async()=>{
  const {mode,calls,locks}=fixture();await mode.enable();await mode.setVisible(false);
  assert.equal(mode.state.enabled,true);assert.equal(mode.state.active,false);assert.equal(mode.state.phase,'paused');assert.equal(locks[0].released,true);
  await mode.setVisible(true);assert.equal(calls.length,2);assert.equal(mode.state.active,true);
});
test('Nach Ausschalten bleibt der Modus auch bei erneuter Sichtbarkeit aus',async()=>{
  const {mode,calls}=fixture();await mode.enable();await mode.disable();await mode.setVisible(false);await mode.setVisible(true);assert.equal(calls.length,1);assert.equal(mode.state.active,false);
});
test('Wiederholte Rückkehr erzeugt bei aktiver Sperre keine zusätzlichen Anfragen',async()=>{
  const {mode,calls}=fixture();await mode.enable();await mode.setVisible(true);await mode.retry();await mode.enable();assert.equal(calls.length,1);
});
test('Fehlende API und unsicherer Kontext werden ohne Fehler unterstützt',async()=>{
  for(const options of [{wakeLock:undefined},{secure:false}]){
    const {mode,calls}=fixture(options);await mode.enable();await mode.retry();await mode.setVisible(false);await mode.disable();
    assert.equal(calls.length,0);assert.equal(mode.state.supported,false);assert.equal(mode.state.active,false);
  }
});
test('Ablehnung führt zu sichtbarem Fehler; erneuter Versuch ist möglich',async()=>{
  let requests=0;const lock=new Sentinel();
  const {mode}=fixture({wakeLock:{request:async()=>{if(++requests===1)throw new Error('NotAllowedError');return lock;}}});
  await mode.enable();assert.equal(mode.state.phase,'error');assert.equal(mode.state.active,false);
  await mode.retry();assert.equal(mode.state.phase,'active');assert.equal(requests,2);
});
test('Auch ein synchroner API-Fehler blockiert spätere Versuche nicht',async()=>{
  let requests=0;const {mode}=fixture({wakeLock:{request:()=>{if(++requests===1)throw new Error('denied');return Promise.resolve(new Sentinel());}}});
  await mode.enable();assert.equal(mode.state.phase,'error');await mode.retry();assert.equal(mode.state.active,true);
});
test('Vom Betriebssystem beendete Sperre wird angezeigt, ohne eine Anfrageschleife',async()=>{
  const {mode,calls,locks}=fixture();await mode.enable();await locks[0].release();
  assert.equal(mode.state.phase,'released');assert.equal(mode.state.active,false);assert.equal(calls.length,1);
  await mode.retry();assert.equal(calls.length,2);assert.equal(mode.state.active,true);
});
test('Ausschalten während laufender Anfrage lässt keine verspätete Sperre zurück',async()=>{
  const pending=deferred(),states=[],lock=new Sentinel();
  const mode=createCookingMode({wakeLock:{request:()=>pending.promise},onChange:s=>states.push(s)});
  const start=mode.enable(),stop=mode.disable();pending.resolve(lock);await Promise.all([start,stop]);
  assert.equal(lock.released,true);assert.equal(mode.state.enabled,false);assert.equal(mode.state.active,false);assert.ok(states.every(s=>!s.active));
});
test('Verstecken während laufender Anfrage gibt die erhaltene Sperre frei',async()=>{
  const pending=deferred(),lock=new Sentinel();const mode=createCookingMode({wakeLock:{request:()=>pending.promise}});
  const start=mode.enable(),hide=mode.setVisible(false);pending.resolve(lock);await Promise.all([start,hide]);
  assert.equal(lock.released,true);assert.equal(mode.state.phase,'paused');
});
test('Schnelles Aus- und Wiedereinschalten behält genau eine aktive Sperre',async()=>{
  const pending=deferred(),lock=new Sentinel();let requests=0;
  const mode=createCookingMode({wakeLock:{request:()=>{requests++;return pending.promise;}}});
  const start=mode.enable(),stop=mode.disable(),again=mode.enable();pending.resolve(lock);await Promise.all([start,stop,again]);
  assert.equal(requests,1);assert.equal(mode.state.active,true);await mode.disable();assert.equal(lock.released,true);
});
test('Eine bereits freigegebene Antwort darf nicht als aktiver Modus erscheinen',async()=>{
  const lock=new Sentinel();await lock.release();const {mode}=fixture({wakeLock:{request:async()=>lock}});
  await mode.enable();assert.equal(mode.state.phase,'released');assert.equal(mode.state.active,false);
});
test('Fehler beim Freigeben bleibt sichtbar und kann erneut beendet werden',async()=>{
  const lock=new Sentinel();const release=lock.release.bind(lock);let attempts=0;
  lock.release=async()=>{if(++attempts===1)throw new Error('release failed');await release();};
  const {mode}=fixture({wakeLock:{request:async()=>lock}});await mode.enable();await mode.disable();
  assert.equal(mode.state.phase,'releaseError');assert.equal(mode.state.active,true);
  await mode.disable();assert.equal(mode.state.active,false);
});
test('Einschalten im Hintergrund wartet bis zur sichtbaren App',async()=>{
  const {mode,calls}=fixture({visible:false});await mode.enable();assert.equal(calls.length,0);assert.equal(mode.state.phase,'paused');
  await mode.setVisible(true);assert.equal(calls.length,1);assert.equal(mode.state.active,true);
});
test('Automatik fordert die Sperre beim Erstellen ohne Schalter an',async()=>{
  const calls=[],lock=new Sentinel();
  const mode=createAutomaticCookingMode({wakeLock:{request:async type=>{calls.push(type);return lock;}}});
  await mode.ready;assert.deepEqual(calls,['screen']);assert.equal(mode.state.active,true);
});
test('Automatik pausiert im Hintergrund und fordert bei Rückkehr erneut an',async()=>{
  const locks=[];const mode=createAutomaticCookingMode({wakeLock:{request:async()=>{const lock=new Sentinel();locks.push(lock);return lock;}}});
  await mode.ready;await mode.setVisible(false);assert.equal(locks[0].released,true);
  await mode.setVisible(true);assert.equal(locks.length,2);assert.equal(mode.state.active,true);
});
test('Eine versteckt gestartete Automatik wartet auf die sichtbare App',async()=>{
  let calls=0;const mode=createAutomaticCookingMode({visible:false,wakeLock:{request:async()=>{calls++;return new Sentinel();}}});
  await mode.ready;assert.equal(calls,0);await mode.setVisible(true);assert.equal(calls,1);
});
test('Normale Bedienung kann eine abgelehnte automatische Anfrage erneut versuchen',async()=>{
  let calls=0;const mode=createAutomaticCookingMode({wakeLock:{request:async()=>{if(++calls===1)throw new Error('denied');return new Sentinel();}}});
  await mode.ready;assert.equal(mode.state.active,false);await mode.retryAfterInteraction();assert.equal(mode.state.active,true);
  await mode.retryAfterInteraction();assert.equal(calls,2);
});
test('Wiederholte Ablehnung führt bei vielen Eingaben zu keiner Anfrageschleife',async()=>{
  let calls=0,time=0;const mode=createAutomaticCookingMode({now:()=>time,wakeLock:{request:async()=>{calls++;throw new Error('denied');}}});
  await mode.ready;await mode.retryAfterInteraction();assert.equal(calls,2);
  for(let n=0;n<20;n++)await mode.retryAfterInteraction();assert.equal(calls,2);
  time=10000;await mode.retryAfterInteraction();assert.equal(calls,3);
});
test('Automatik bleibt bei fehlender Unterstützung ohne Anfragen bedienbar',async()=>{
  const mode=createAutomaticCookingMode({wakeLock:undefined});await mode.ready;
  await mode.retryAfterInteraction();await mode.setVisible(false);await mode.setVisible(true);
  assert.equal(mode.state.phase,'unsupported');assert.equal(mode.state.active,false);
});

