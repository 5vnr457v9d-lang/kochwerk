import {emptyData,validateBackup} from './domain.js';
let dbPromise;
function db() {
  return dbPromise??=new Promise((resolve,reject)=>{
    const req=indexedDB.open('kochwerk-local',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('state');
    req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result);};
    req.onerror=()=>reject(new Error('Lokaler Speicher nicht verfügbar. Bitte normalen Browsermodus verwenden.'));
    req.onblocked=()=>reject(new Error('Bitte andere Kochwerk-Fenster schließen und neu laden.'));
  });
}
export async function readData() {
  const database=await db();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction('state','readonly'),req=tx.objectStore('state').get('data');
    let data;req.onsuccess=()=>{data=req.result;};
    tx.oncomplete=()=>{try{resolve(data?validateBackup(data):emptyData());}catch(e){reject(e);}};
    tx.onerror=()=>reject(tx.error);
  });
}
export async function writeData(data,expectedRevision) {
  const clean=validateBackup(data);
  if(new Blob([JSON.stringify(clean)]).size>40000000)throw new Error('Die Sammlung überschreitet 40 MB. Bitte große Bilder entfernen oder verkleinern und eine Sicherung exportieren.');
  const database=await db();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction('state','readwrite'),store=tx.objectStore('state'),req=store.get('data');
    let conflict=false;
    req.onsuccess=()=>{
      if((req.result?.revision??0)!==expectedRevision){conflict=true;tx.abort();return;}
      clean.revision=expectedRevision+1;store.put(clean,'data');
    };
    tx.oncomplete=()=>resolve(clean);
    tx.onabort=()=>reject(new Error(conflict?'Die Daten wurden in einem anderen Fenster geändert. Bitte neu laden; diese Änderung wurde nicht gespeichert.':'Speichern fehlgeschlagen. Möglicherweise ist der Gerätespeicher voll. Bitte eine Sicherung exportieren.'));
    tx.onerror=()=>{};
  });
}
