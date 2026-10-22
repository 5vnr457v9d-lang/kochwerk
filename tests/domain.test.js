import test from 'node:test';
import assert from 'node:assert/strict';
import {numberInput,optionalNumberInput,formatAmount,decimalString,validateRecipe,scaleRecipe,validateBackup,mergeBackup,emptyData} from '../domain.js';
import {demoData} from '../demo.js';

const fixture=()=>validateBackup(demoData());
test('Deutsche und englische Dezimaleingaben sowie führende Nullen',()=>{
  for(const [s,n] of [['2,5',2.5],[' 500 ',500],['0.25',.25],[',75',.75],['0010',10],['0',0]])assert.equal(numberInput(s),n);
});
for(const input of ['', ' ', '-1', '1e5', '1.000,5', '1,2,3', 'NaN', 'Infinity', '2 g', '+2', '0x10'])test(`Ungültige Eingabe ablehnen: ${JSON.stringify(input)}`,()=>assert.throws(()=>numberInput(input)));
test('Anzeige verwendet deutsches Dezimalkomma',()=>assert.equal(formatAmount(2.125),'2,125'));
test('Sehr kleine gespeicherte Mengen bleiben als Dezimaleingabe bearbeitbar',()=>{
  for(const n of [0,.0000001,1.23e-15,Number.MIN_VALUE,1e12,1e25]){const s=decimalString(n);assert.ok(!s.includes('e'));assert.equal(numberInput(s),n);}
});
test('500 g Master auf 750 g skaliert alle Zutaten exakt mit Faktor 1,5',()=>{
  const r=fixture().recipes[0],snapshot=structuredClone(r),scaled=scaleRecipe(r,750);
  assert.equal(scaled.factor,1.5);assert.deepEqual(scaled.ingredients.map(x=>x.amount),[750,525,150,15]);assert.deepEqual(r,snapshot);
});
test('Wiederholtes Skalieren verwendet immer die unveränderten Originalwerte',()=>{
  const r=fixture().recipes[0];for(let n=0;n<1000;n++)scaleRecipe(r,333.333);assert.equal(scaleRecipe(r,500).ingredients[1].amount,350);
});
test('Stückmengen bleiben Bruchteile; Einheiten werden nicht konvertiert',()=>{
  const r=fixture().recipes[1],scaled=scaleRecipe(r,125);assert.equal(scaled.ingredients[3].amount,2);assert.equal(scaled.ingredients[4].amount,.5);assert.equal(scaled.ingredients[3].unit,'Stück');
});
for(const target of [0,-1,NaN,Infinity,-Infinity,'500'])test(`Ungültiges Skalierungsziel ${target}`,()=>assert.throws(()=>scaleRecipe(fixture().recipes[0],target)));
test('Fehlende oder ursprünglich leere Bezugszutat ablehnen',()=>{
  const r=fixture().recipes[0];assert.throws(()=>scaleRecipe(r,10,'missing'));r.ingredients[0].amount=0;assert.throws(()=>scaleRecipe(r,10,r.ingredients[0].id));
});
test('Überlauf und Unterlauf der Mengen werden abgefangen',()=>{
  const r=fixture().recipes[0];r.ingredients[0].amount=Number.MIN_VALUE;assert.throws(()=>scaleRecipe(r,Number.MAX_VALUE));r.ingredients[0].amount=Number.MAX_VALUE;assert.throws(()=>scaleRecipe(r,Number.MIN_VALUE));
});
test('Nullmengen sind für andere Zutaten erlaubt',()=>{
  const d=fixture(),r=d.recipes[0];r.ingredients[1].amount=0;assert.equal(validateRecipe(r,d.books).ingredients[1].amount,0);assert.equal(scaleRecipe(r,100).ingredients[1].amount,0);
});
test('Ungültige, negative und übergroße Zutatenmengen ablehnen',()=>{
  for(const n of [-1,Infinity,NaN,1e13,'5']){const d=fixture();d.recipes[0].ingredients[1].amount=n;assert.throws(()=>validateBackup(d));}
});
test('Rezepte brauchen Titel und mindestens eine Zutat',()=>{
  const d=fixture();d.recipes[0].title=' ';assert.throws(()=>validateBackup(d));d.recipes[0].title='Brot';d.recipes[0].ingredients=[];assert.throws(()=>validateBackup(d));
});
test('Keine fremden Kochbuch-Verweise oder doppelten IDs',()=>{
  const d=fixture();d.recipes[0].bookIds=['unknown'];assert.throws(()=>validateBackup(d));
  const d2=fixture();d2.recipes.push(d2.recipes[0]);assert.throws(()=>validateBackup(d2));
  const d3=fixture();d3.books.push(d3.books[0]);assert.throws(()=>validateBackup(d3));
  const d4=fixture();d4.recipes[0].ingredients[1].id=d4.recipes[0].ingredients[0].id;assert.throws(()=>validateBackup(d4));
});
test('Zeitangaben müssen nichtnegative ganze Minuten sein',()=>{
  for(const minutes of [-1,.5,NaN,100001]){const d=fixture();d.recipes[0].minutes=minutes;assert.throws(()=>validateBackup(d));}
});
test('Nur eingebettete Rasterbilder zulassen; externe Bilder und SVG ablehnen',()=>{
  for(const photo of ['https://example.com/pic.png','data:image/svg+xml;base64,PHN2Zz4=','javascript:alert(1)']){const d=fixture();d.recipes[0].photo=photo;assert.throws(()=>validateBackup(d));}
  const d=fixture();d.recipes[0].photo='data:image/jpeg;base64,/9j/AA==';assert.equal(validateBackup(d).recipes[0].photo,d.recipes[0].photo);
});
test('Falsches Sicherungsformat wird abgelehnt',()=>{for(const raw of [null,{},[],{version:2,books:[],recipes:[]},{version:1,books:null,recipes:[]}])assert.throws(()=>validateBackup(raw));});
test('Export/Import-Rundlauf behält alle Informationen',()=>{
  const d=fixture();assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(d))),d);
});
test('Import ergänzt Rezepte und führt gleichnamige Kochbücher zusammen',()=>{
  const d=fixture(),incoming=fixture(),original=structuredClone(d),result=mergeBackup(d,incoming);
  assert.equal(result.books.length,3);assert.equal(result.recipes.length,8);assert.equal(new Set(result.recipes.map(r=>r.id)).size,8);assert.deepEqual(d,original);
  assert.ok(result.recipes.every(r=>r.bookIds.every(id=>result.books.some(b=>b.id===id))));
});
test('Import kann alle Daten in eine leere Sammlung übernehmen',()=>{
  const result=mergeBackup(emptyData(),fixture());assert.equal(result.recipes.length,4);assert.equal(result.books.length,3);
});
test('Unbekannte Felder werden nicht in die lokale Datenstruktur übernommen',()=>{
  const d=fixture();d.recipes[0].unexpected='ignored';d.books[0].tracking='ignored';const clean=validateBackup(d);assert.equal(clean.recipes[0].unexpected,undefined);assert.equal(clean.books[0].tracking,undefined);
});
test('Jede beliebige Zutat kann das Verhältnis bestimmen',()=>{
  const r=fixture().recipes[0],before=structuredClone(r);
  for(const ingredient of r.ingredients){
    const result=scaleRecipe(r,ingredient.amount*1.5,ingredient.id);
    assert.equal(result.factor,1.5);
    assert.deepEqual(result.ingredients.map(i=>i.amount),[750,525,150,15]);
  }
  assert.deepEqual(r,before);
});
test('Wechsel von Wasser auf Salz rechnet erneut aus den Originalmengen',()=>{
  const r=fixture().recipes[0];
  assert.equal(scaleRecipe(r,525,r.ingredients[1].id).factor,1.5);
  const result=scaleRecipe(r,20,r.ingredients[3].id);
  assert.equal(result.factor,2);assert.deepEqual(result.ingredients.map(i=>i.amount),[1000,700,200,20]);
  assert.deepEqual(scaleRecipe(r,500,r.ingredients[0].id).ingredients,r.ingredients);
});
test('Rezepte ohne Masterauswahl können gespeichert und gesichert werden',()=>{
  const d=fixture();delete d.recipes[0].masterId;
  const cleaned=validateBackup(d);assert.equal(cleaned.recipes[0].ingredients[1].amount,350);
  assert.equal(scaleRecipe(cleaned.recipes[0],700,cleaned.recipes[0].ingredients[1].id).factor,2);
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(cleaned))),cleaned);
});
test('Entfernen der früheren Masterzutat verhindert das Speichern nicht',()=>{
  const d=fixture(),r=d.recipes[0];r.ingredients.shift();
  const cleaned=validateRecipe(r,d.books);
  assert.equal(cleaned.ingredients[0].name,'Wasser');
  assert.equal(scaleRecipe(cleaned,700,cleaned.ingredients[0].id).factor,2);
});
test('Auch doppelt benannte Zutaten werden eindeutig über ihre ID umgerechnet',()=>{
  const d=fixture(),r=d.recipes[0];r.ingredients[1].name=r.ingredients[0].name;
  const result=scaleRecipe(r,700,r.ingredients[1].id);assert.equal(result.ingredients[0].amount,1000);
});
test('Ein Rezept nur mit Nullmengen kann gespeichert, aber nicht umgerechnet werden',()=>{
  const d=fixture(),r=d.recipes[0];r.ingredients.forEach(i=>i.amount=0);
  const clean=validateRecipe(r,d.books);assert.ok(clean.ingredients.every(i=>i.amount===0));assert.throws(()=>scaleRecipe(clean,10));
});

test('Leere optionale Mengeneingaben bleiben von 0 unterscheidbar',()=>{
  for(const value of ['', ' ', '\t'])assert.equal(optionalNumberInput(value),null);
  assert.equal(optionalNumberInput('0'),0);assert.equal(optionalNumberInput('2,5'),2.5);
  assert.throws(()=>optionalNumberInput('Salz'));assert.throws(()=>optionalNumberInput('-2'));
});
test('Ein Rezept kann vollständig ohne Mengen und Einheiten gespeichert werden',()=>{
  const d=fixture(),r=d.recipes[0];r.ingredients.forEach(i=>{delete i.amount;delete i.unit;});
  const clean=validateRecipe(r,d.books);assert.ok(clean.ingredients.every(i=>i.amount===null&&i.unit===''));assert.equal(clean.masterId,undefined);
});
test('Menge und Einheit sind unabhängig voneinander optional',()=>{
  const d=fixture(),r=d.recipes[0];r.ingredients[0].amount=null;r.ingredients[0].unit='nach Geschmack';r.ingredients[1].unit='';
  const clean=validateRecipe(r,d.books);assert.equal(clean.ingredients[0].amount,null);assert.equal(clean.ingredients[0].unit,'nach Geschmack');assert.equal(clean.ingredients[1].amount,350);assert.equal(clean.ingredients[1].unit,'');
});
test('Zutaten ohne Menge bleiben beim Skalieren ohne Menge und unverändert benannt',()=>{
  const d=fixture(),r=d.recipes[0];r.ingredients[1].amount=null;const before=structuredClone(r);
  const result=scaleRecipe(r,1000,r.ingredients[0].id);assert.equal(result.ingredients[0].amount,1000);assert.equal(result.ingredients[1].amount,null);assert.equal(result.ingredients[1].unit,'g');assert.equal(result.ingredients[3].amount,20);assert.deepEqual(r,before);
  assert.throws(()=>scaleRecipe(r,10,r.ingredients[1].id));
});
test('Sicherung und Import erhalten fehlende Mengen und Zutatenreihenfolge',()=>{
  const d=fixture(),r=d.recipes[0];r.ingredients.reverse();r.ingredients[1].amount=null;r.ingredients[1].unit='';
  const clean=validateBackup(d),roundtrip=validateBackup(JSON.parse(JSON.stringify(clean)));
  assert.deepEqual(roundtrip,clean);const imported=mergeBackup(emptyData(),roundtrip);assert.deepEqual(imported.recipes[0].ingredients,clean.recipes[0].ingredients);
});
test('Entfernen der letzten bezifferten Menge verhindert weiteres Speichern nicht',()=>{
  const d=fixture(),r=d.recipes[0];r.ingredients=r.ingredients.map(i=>({...i,amount:null}));
  const clean=validateRecipe(r,d.books);assert.equal(clean.ingredients.length,r.ingredients.length);assert.ok(clean.ingredients.every(i=>i.amount===null));assert.throws(()=>scaleRecipe(clean,100));
});
test('Umsortieren behält Identitäten und Zuordnung von Mengen, Einheiten und Skalierungsbasis',()=>{
  const d=fixture(),r=d.recipes[0],original=structuredClone(r.ingredients);r.ingredients=[r.ingredients[2],r.ingredients[0],r.ingredients[3],r.ingredients[1]];
  const clean=validateRecipe(r,d.books);assert.deepEqual(clean.ingredients,r.ingredients);
  const result=scaleRecipe(clean,1000,original[0].id);for(const i of result.ingredients){const old=original.find(j=>j.id===i.id);assert.equal(i.amount,old.amount*2);assert.equal(i.name,old.name);assert.equal(i.unit,old.unit);}
});
