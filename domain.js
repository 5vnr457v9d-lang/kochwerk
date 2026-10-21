export const uid = () => crypto.randomUUID();
export const emptyData = () => ({version:1, revision:0, books:[], recipes:[]});
export function numberInput(value) {
  const text = String(value).trim();
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) throw new Error('Bitte eine gültige Zahl eingeben, z. B. 500 oder 2,5.');
  const n = Number(text.replace(',', '.'));
  if (!Number.isFinite(n)) throw new Error('Die Zahl ist zu groß.');
  return n;
}
export const formatAmount = n => new Intl.NumberFormat('de-DE',{maximumFractionDigits:3}).format(n);
export function decimalString(n) {
  const [coefficient,exponent]=String(n).split('e');
  if(exponent===undefined)return coefficient;
  const negative=coefficient.startsWith('-'),unsigned=coefficient.replace('-',''),digits=unsigned.replace('.','');
  const point=(unsigned.includes('.')?unsigned.indexOf('.'):unsigned.length)+Number(exponent);
  const value=point<=0?'0.'+'0'.repeat(-point)+digits:point>=digits.length?digits+'0'.repeat(point-digits.length):digits.slice(0,point)+'.'+digits.slice(point);
  return (negative?'-':'')+value;
}
function string(v, name, max=10000) {
  if (typeof v !== 'string' || v.length>max) throw new Error(`${name}: ungültiger Text oder zu lang.`);
  return v.trim();
}
function id(v) { const s=string(v,'ID',100); if(!s)throw new Error('ID fehlt.'); return s; }
function unique(rows) { if(new Set(rows.map(x=>x.id)).size!==rows.length)throw new Error('Doppelte IDs sind nicht erlaubt.'); }
export function validateRecipe(r, books) {
  if(!r || typeof r!=='object')throw new Error('Ungültiges Rezept.');
  const title=string(r.title,'Rezeptname',160); if(!title)throw new Error('Bitte einen Rezeptnamen angeben.');
  if(!Array.isArray(r.ingredients)||r.ingredients.length<1||r.ingredients.length>150)throw new Error('Ein Rezept braucht 1 bis 150 Zutaten.');
  const ingredients=r.ingredients.map(i=>{
    const name=string(i.name,'Zutat',160), unit=string(i.unit,'Einheit',30);
    if(!name||typeof i.amount!=='number'||!Number.isFinite(i.amount)||i.amount<0||i.amount>1e12)throw new Error('Jede Zutat braucht einen Namen und eine Menge zwischen 0 und 1 Billion.');
    return {id:id(i.id),name,amount:i.amount,unit};
  }); unique(ingredients);
  const masterId=id(r.masterId), master=ingredients.find(i=>i.id===masterId);
  if(!master||master.amount<=0)throw new Error('Bitte genau eine Masterzutat mit einer Menge größer als 0 wählen.');
  if(!Array.isArray(r.bookIds)||r.bookIds.some(b=>!books.some(x=>x.id===b)))throw new Error('Unbekanntes Kochbuch.');
  if(!Array.isArray(r.steps)||r.steps.length>150)throw new Error('Ungültige Zubereitung.');
  if(!Number.isInteger(r.minutes)||r.minutes<0||r.minutes>100000)throw new Error('Zeit muss eine ganze Zahl zwischen 0 und 100000 sein.');
  const photo=r.photo??'';
  if(typeof photo!=='string'||photo.length>1500000||(photo&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)))throw new Error('Ungültiges Rezeptbild.');
  return {id:id(r.id),title,description:string(r.description??'','Beschreibung',500),notes:string(r.notes??'','Notizen'),minutes:r.minutes,ingredients,masterId,bookIds:[...new Set(r.bookIds)],steps:r.steps.map(s=>string(s,'Schritt',5000)).filter(Boolean),favorite:r.favorite===true,photo,createdAt:string(r.createdAt??new Date().toISOString(),'Datum',50),updatedAt:string(r.updatedAt??new Date().toISOString(),'Datum',50)};
}
export function scaleRecipe(recipe,target) {
  if(typeof target!=='number'||!Number.isFinite(target)||target<=0)throw new Error('Die Zielmenge muss größer als 0 sein.');
  const master=recipe.ingredients.find(i=>i.id===recipe.masterId);
  if(!master||!Number.isFinite(master.amount)||master.amount<=0)throw new Error('Die Masterzutat fehlt oder ist ungültig.');
  const factor=target/master.amount;
  if(!Number.isFinite(factor)||factor<=0)throw new Error('Ungültiger Skalierungsfaktor.');
  const ingredients=recipe.ingredients.map(i=>{
    const amount=i.amount*factor;
    if(!Number.isFinite(amount)||(i.amount>0&&amount===0))throw new Error('Die Zielmenge ist zu groß oder zu klein.');
    return {...i,amount};
  }); return {factor,ingredients};
}
export function validateBackup(raw) {
  if(!raw||raw.version!==1||!Array.isArray(raw.books)||!Array.isArray(raw.recipes))throw new Error('Keine unterstützte Kochwerk-Sicherung (Version 1).');
  if(raw.books.length>500||raw.recipes.length>5000)throw new Error('Die Sicherung enthält zu viele Einträge.');
  const books=raw.books.map(b=>{const name=string(b.name,'Kochbuch',80);if(!name)throw new Error('Kochbuchname fehlt.');return {id:id(b.id),name,color:['sage','clay','gold','blue'].includes(b.color)?b.color:'sage'};}); unique(books);
  const recipes=raw.recipes.map(r=>validateRecipe(r,books)); unique(recipes);
  return {version:1,revision:Number.isSafeInteger(raw.revision)&&raw.revision>=0?raw.revision:0,books,recipes};
}
export function mergeBackup(current,incoming) {
  const data=validateBackup(incoming), result=structuredClone(current), map=new Map();
  for(const b of data.books) {
    let found=result.books.find(x=>x.name.toLocaleLowerCase('de')===b.name.toLocaleLowerCase('de'));
    if(!found){found={...b,id:uid()};result.books.push(found);}map.set(b.id,found.id);
  }
  for(const r of data.recipes)result.recipes.push({...r,id:uid(),bookIds:r.bookIds.map(b=>map.get(b))});
  return validateBackup(result);
}
