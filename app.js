import {uid,emptyData,numberInput,optionalNumberInput,formatAmount,decimalString,validateRecipe,validateBackup,scaleRecipe,mergeBackup} from './domain.js';
import {readData,writeData} from './storage.js';
import {demoData} from './demo.js';
import {icon,cover,recipeArt} from './art.js';
import {createAutomaticCookingMode,connectCookingMode} from './cooking-mode.js';

const $=(q,root=document)=>root.querySelector(q);
const $$=(q,root=document)=>[...root.querySelectorAll(q)];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amountText=n=>n==null?'':n>0&&n<.001?'< 0,001':formatAmount(n);
const editableAmount=n=>n==null?'':n>0&&n<.001?decimalString(n).replace('.',','):new Intl.NumberFormat('de-DE',{useGrouping:false,maximumFractionDigits:3}).format(n);
const main=$('#main'),modal=$('#modal');
let data=emptyData(),ready=false,busy=false,query='',bookFilter='',sort='recent',toastTimer,routeReturn='#recipes',editorPhoto='',photoLoading=false,installPrompt;
const channel='BroadcastChannel' in window?new BroadcastChannel('kochwerk-changes'):null;
const cookingMode=createAutomaticCookingMode({wakeLock:navigator.wakeLock,secure:isSecureContext,visible:false,onChange:renderCookingMode});
const cookingLifecycle=connectCookingMode(cookingMode,{document,window});
function renderCookingMode(state=cookingMode.state){
  const status=$('#cook-status');if(!status)return;
  if(status.textContent!==state.message)status.textContent=state.message;
  status.classList.toggle('cook-mode-error',['error','released','releaseError'].includes(state.phase));
}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4500);}
function error(e,root=modal.open?modal:main){let el=$('.form-error',root);if(!el){el=document.createElement('p');el.className='form-error';el.setAttribute('role','alert');root.prepend(el);}el.textContent=e.message??String(e);el.scrollIntoView({block:'nearest'});}
function button(text,action,name='',extra=''){return `<button type="button" class="button ${extra}" data-action="${action}">${name?icon(name):''}${text}</button>`;}
function iconButton(name,action,label,extra=''){return `<button type="button" class="icon-button ${extra}" data-action="${action}" aria-label="${label}" title="${label}">${icon(name)}</button>`;}
async function commit(next){if(busy)throw new Error('Speichern läuft bereits.');busy=true;try{data=await writeData(next,data.revision);channel?.postMessage('changed');updateSidebar();}finally{busy=false;}}
function updateSidebar(){
  $('#recipe-count').textContent=data.recipes.length;
  $('#book-links').innerHTML=data.books.slice(0,8).map(b=>`<a class="book-link" href="#book/${encodeURIComponent(b.id)}"><span class="book-dot ${b.color}"></span>${escape(b.name)}</a>`).join('')||'<p class="muted">Platz für deine Sammlungen.</p>';
}
function route(){const parts=location.hash.slice(1).split('/');let rid='';try{rid=decodeURIComponent(parts[1]??'');}catch{}return {page:parts[0]||'recipes',id:rid};}
function render(){
  if(!ready)return;
  const {page,id}=route();
  const nav=page==='book'?'books':page==='recipe'?'recipes':page;
  $$('[data-nav]').forEach(a=>{const selected=a.dataset.nav===nav;a.classList.toggle('active',selected);if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  $('#page-label').textContent=({recipes:'Rezeptsammlung',favorites:'Lieblingsrezepte',books:'Meine Kochbücher',settings:'Daten & App',book:'Kochbuch',recipe:'Rezept'})[page]??'Rezeptsammlung';
  if(page==='recipe')renderDetail(id);
  else if(page==='books')renderBooks();
  else if(page==='settings')renderSettings();
  else renderRecipes(page,id);
  $$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
}
function hero(title,text,actions,art=false){return `<section class="hero"><div><div class="eyebrow">GUTES ESSEN BEGINNT HIER</div><h1>${title}</h1><p>${text}</p></div>${art?`<div class="hero-art">${cover('generic')}</div>`:''}<div class="hero-actions">${actions}</div></section>`;}
function renderRecipes(page='recipes',id=''){
  const book=page==='book'?data.books.find(b=>b.id===id):null;
  if(page==='book'&&!book){main.innerHTML='<div class="empty"><h2>Kochbuch nicht gefunden</h2><a class="button" href="#books">Zu den Kochbüchern</a></div>';return;}
  const title=book?`<span class="book-title">${escape(book.name)}</span>`:page==='favorites'?'Immer wieder<br><em>Lieblingsrezepte.</em>':'Deine Küche.<br><em>Deine Rezepte.</em>';
  main.innerHTML=hero(title,book?'Deine Rezepte, an einem Ort gesammelt.':page==='favorites'?'Die Rezepte, die du am liebsten wieder kochst.':'Alles, was du gerne kochst und backst. Sammle deine Rezepte und mach sie zu deinen eigenen.',`${book?button('Kochbuch bearbeiten','edit-current-book','edit'):button('Kochbücher','go-books','book')}${button('Neues Rezept','new-recipe','plus','primary')}`,!book)
    +`<div class="tools"><div class="search">${icon('search')}<input id="search" type="search" placeholder="Rezept oder Zutat suchen …" aria-label="Rezepte und Zutaten durchsuchen" enterkeyhint="search" value="${escape(query)}" maxlength="160"><button id="clear-search" type="button" class="icon-button search-clear" aria-label="Suche löschen" title="Suche löschen" ${query?'':'hidden'}>${icon('close')}</button></div><div class="filters">${!book?`<select id="book-filter" aria-label="Nach Kochbuch filtern"><option value="">Alle Kochbücher</option>${data.books.map(b=>`<option value="${escape(b.id)}" ${bookFilter===b.id?'selected':''}>${escape(b.name)}</option>`).join('')}</select>`:''}<select id="sort" aria-label="Rezepte sortieren"><option value="recent" ${sort==='recent'?'selected':''}>Zuletzt bearbeitet</option><option value="title" ${sort==='title'?'selected':''}>Name A–Z</option><option value="time" ${sort==='time'?'selected':''}>Zubereitungszeit</option></select></div></div><div class="section-title"><h2>${book?'Im Kochbuch':page==='favorites'?'Deine Favoriten':'Deine Sammlung'}</h2><p id="result-count"></p></div><div id="recipe-results"></div><div class="note-strip">${icon('leaf')}<span><strong>So viel, wie du brauchst.</strong> Ändere im Rezept die Menge einer beliebigen Zutat. Alle anderen Zutaten passen sich proportional an.</span></div>`;
  const search=$('#search'),clearSearch=$('#clear-search');
  search.addEventListener('input',()=>{query=search.value;clearSearch.hidden=!query;renderResults();});
  clearSearch.addEventListener('click',()=>{query='';search.value='';search.blur();clearSearch.hidden=true;renderResults();});
  $('#book-filter')?.addEventListener('change',e=>{bookFilter=e.target.value;renderResults();});
  $('#sort').addEventListener('change',e=>{sort=e.target.value;renderResults();});
  renderResults();
}
function renderResults(){
  const {page,id}=route(),q=query.trim().toLocaleLowerCase('de');
  let recipes=data.recipes.filter(r=>(page!=='favorites'||r.favorite)&&(page!=='book'||r.bookIds.includes(id))&&(page==='book'||!bookFilter||r.bookIds.includes(bookFilter))&&(!q||[r.title,r.description,...r.ingredients.map(i=>i.name)].some(s=>s.toLocaleLowerCase('de').includes(q))));
  recipes.sort(sort==='title'?(a,b)=>a.title.localeCompare(b.title,'de'):sort==='time'?(a,b)=>a.minutes-b.minutes:(a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  $('#result-count').textContent=`${recipes.length} ${recipes.length===1?'Rezept':'Rezepte'}`;
  const add=`<button class="add-card" data-action="new-recipe"><span>+</span><strong>Etwas Gutes hinzufügen</strong><p>Dein nächstes Lieblingsrezept<br>wartet schon.</p></button>`;
  if(!data.recipes.length){$('#recipe-results').innerHTML=`<div class="empty">${icon('book')}<h2>Hier beginnt dein Kochbuch.</h2><p>Ein Familienrezept, dein bestes Brot oder ein neuer Kuchen: Gib deinen guten Rezepten ein Zuhause.</p><div class="empty-actions">${button('Erstes Rezept anlegen','new-recipe','plus','primary')}${button('Beispielrezepte laden','load-demo','book')}</div><p class="editor-tip">Beispiele werden nur auf Wunsch hinzugefügt.</p></div>`;return;}
  if(!recipes.length){$('#recipe-results').innerHTML=`<div class="empty"><h2>${q?'Nichts gefunden.':'Hier ist noch Platz.'}</h2><p>${q?'Versuche einen anderen Rezeptnamen oder eine andere Zutat.':page==='favorites'?'Tippe bei einem Rezept auf das Herz, um es hier zu sammeln.':'Ordne diesem Kochbuch beim Bearbeiten ein Rezept zu.'}</p>${button('Neues Rezept','new-recipe','plus','primary')}</div>`;return;}
  $('#recipe-results').innerHTML=`<div class="recipe-grid">${recipes.map(card).join('')}${add}</div>`;
}
function card(r){
  const book=data.books.find(b=>r.bookIds.includes(b.id));
  return `<article class="recipe-card"><a class="card-link" href="#recipe/${encodeURIComponent(r.id)}"><div class="recipe-cover">${r.photo?`<img src="${r.photo}" alt="" loading="lazy">`:recipeArt(r)}</div><div class="card-body"><p class="card-category">${escape(book?.name??'Meine Rezepte')}</p><h3>${escape(r.title)}</h3><p>${escape(r.description||'Ein Rezept aus deiner Küche.')}</p><div class="card-meta"><span>${icon('clock')}${r.minutes?r.minutes+' Min.':'Ohne Zeitangabe'}</span><span>${r.ingredients.length} Zutaten</span></div></div></a><button class="favorite-button ${r.favorite?'selected':''}" data-action="favorite" data-id="${escape(r.id)}" aria-label="${r.favorite?'Favorit entfernen':'Als Favorit speichern'}: ${escape(r.title)}" aria-pressed="${r.favorite}">${icon('heart')}</button></article>`;
}
function renderBooks(){
  main.innerHTML=hero('Ein Buch für<br><em>jeden Geschmack.</em>','Brot, Kuchen oder Familienküche: Ordne deine Rezepte so, wie es zu dir passt.',button('Neues Kochbuch','new-book','plus','primary'))
    +`<div class="section-title"><h2>Deine Kochbücher</h2><p>${data.books.length} Sammlungen</p></div>`+(data.books.length?`<div class="book-grid">${data.books.map(b=>`<article class="book-card ${b.color}"><a href="#book/${encodeURIComponent(b.id)}">${icon('book')}<h2 class="book-title">${escape(b.name)}</h2><p>${data.recipes.filter(r=>r.bookIds.includes(b.id)).length} Rezepte · Sammlung öffnen →</p></a><button class="icon-button" data-action="edit-book" data-id="${escape(b.id)}" aria-label="${escape(b.name)} bearbeiten">${icon('edit')}</button></article>`).join('')}</div>`:`<div class="empty"><h2>Deine Rezepte. Gut sortiert.</h2><p>Lege zum Beispiel „Brot“, „Kuchen“ oder „Alltagsküche“ an. Ein Rezept kann in mehreren Kochbüchern liegen.</p>${button('Kochbuch anlegen','new-book','plus','primary')}</div>`);
}
function renderDetail(id){
  const r=data.recipes.find(r=>r.id===id);if(!r){main.innerHTML='<div class="empty"><h2>Rezept nicht gefunden</h2><a href="#recipes" class="button">Zur Sammlung</a></div>';return;}
  main.innerHTML=`<a class="back" href="${escape(routeReturn)}">${icon('arrow')} Zur Sammlung</a><div class="detail-heading"><div><div class="eyebrow">${escape(r.bookIds.map(id=>data.books.find(b=>b.id===id)?.name).filter(Boolean).join(' · ')||'MEIN REZEPT')}</div><h1>${escape(r.title)}</h1><p>${escape(r.description)}</p><p>${icon('clock').replace('<svg','<svg class="inline-icon"')} ${r.minutes?r.minutes+' Minuten · angegebene Rezeptzeit':'Keine Zeitangabe'}</p></div><div class="detail-actions">${iconButton('heart','favorite-detail',r.favorite?'Favorit entfernen':'Als Favorit speichern',r.favorite?'is-favorite':'')}${iconButton('edit','edit-recipe','Rezept bearbeiten')}${iconButton('copy','copy-recipe','Rezept duplizieren')}${iconButton('print','print','Rezept drucken')}${iconButton('trash','delete-recipe','Rezept löschen')}</div></div>${r.photo?`<img class="detail-photo" src="${r.photo}" alt="${escape(r.title)}">`:''}<div class="detail-layout"><section class="ingredients-panel" aria-labelledby="ingredients-heading"><h2 id="ingredients-heading">Die Zutaten</h2><div class="scale-box"><p class="editor-tip">Ändere eine eingetragene Zutatenmenge. Alle anderen Mengen passen sich proportional an; Zutaten ohne Menge bleiben ohne Mengenangabe.</p>${button('Originalmengen','reset-scale','arrow')}<p id="scale-info" class="scale-info" role="status">${r.ingredients.some(i=>i.amount>0)?'Originalrezept · Faktor 1':'Keine positive Originalmenge zum Umrechnen vorhanden.'}</p></div><ul class="ingredients-list" id="ingredients-list">${r.ingredients.map((i,n)=>`<li class="ingredient"><input id="ingredient-check-${n}" type="checkbox"><label for="ingredient-check-${n}"><span>${escape(i.name)}</span></label><div class="ingredient-quantity"><input class="ingredient-amount" id="quantity-${n}" data-quantity="${n}" type="text" inputmode="decimal" value="${editableAmount(i.amount)}" aria-label="Menge für ${escape(i.name)}${i.unit?' in '+escape(i.unit):''}" aria-describedby="scale-info" autocomplete="off" ${i.amount==null?'disabled placeholder="ohne Menge" title="Ohne Originalmenge ist keine Umrechnung möglich"':i.amount===0?'disabled title="Originalmenge 0: keine proportionale Umrechnung möglich"':''}><span class="ingredient-unit">${escape(i.unit)}</span><span class="print-amount" data-print-amount="${n}">${escape(amountText(i.amount))} ${escape(i.unit)}</span></div></li>`).join('')}</ul><p class="editor-tip">Die Originalmengen bleiben gespeichert. Anzeige auf höchstens 3 Nachkommastellen; Stückmengen können Bruchteile sein.${r.ingredients.some(i=>i.amount===0)?' Zutaten mit Originalmenge 0 bleiben bei 0 und können nicht zur Umrechnung verwendet werden.':''}</p></section><section aria-labelledby="steps-heading"><h2 id="steps-heading">So wird’s gemacht</h2>${r.steps.length?`<ol class="steps">${r.steps.map((s,n)=>`<li><label><input type="checkbox" aria-label="Schritt ${n+1} erledigt">${escape(s)}</label></li>`).join('')}</ol>`:'<p class="muted">Noch keine Zubereitungsschritte hinterlegt.</p>'}${r.notes?`<aside class="recipe-notes"><h3>GUT ZU WISSEN</h3>${escape(r.notes)}</aside>`:''}<p class="muted no-print">Back- und Garzeiten sowie die passende Formgröße bitte selbst prüfen: Sie ändern sich nicht automatisch mit der Zutatenmenge.</p></section></div>`;
  $$('[data-quantity]').forEach(el=>el.addEventListener('input',()=>updateScale(r,el)));
  $('.detail-actions [data-action="favorite-detail"]').setAttribute('aria-pressed',String(r.favorite));
}
function updateScale(r,el){
  const info=$('#scale-info');
  try{
    const reference=r.ingredients[Number(el.dataset.quantity)],target=numberInput(el.value),scaled=scaleRecipe(r,target,reference.id);
    $$('[data-quantity]').forEach((input,n)=>{
      if(input!==el)input.value=editableAmount(scaled.ingredients[n].amount);
      input.removeAttribute('aria-invalid');
      input.classList.toggle('scaling-basis',input===el);
      $(`[data-print-amount="${n}"]`).textContent=amountText(scaled.ingredients[n].amount)+' '+r.ingredients[n].unit;
    });
    info.textContent=`Faktor ${amountText(scaled.factor)} · berechnet anhand ${reference.name}`;
    info.classList.remove('error');
  }catch(e){
    info.textContent=e.message+' Die übrigen Mengen bleiben auf dem letzten gültigen Stand.';
    info.classList.add('error');el.setAttribute('aria-invalid','true');
  }
}
function resetScale(r){
  $$('[data-quantity]').forEach((input,n)=>{
    input.value=editableAmount(r.ingredients[n].amount);
    input.removeAttribute('aria-invalid');input.classList.remove('scaling-basis');
    $(`[data-print-amount="${n}"]`).textContent=amountText(r.ingredients[n].amount)+' '+r.ingredients[n].unit;
  });
  $('#scale-info').textContent=r.ingredients.some(i=>i.amount>0)?'Originalrezept · Faktor 1':'Keine positive Originalmenge zum Umrechnen vorhanden.';$('#scale-info').classList.remove('error');
}
function renderSettings(){
  main.innerHTML=hero('Dein Kochbuch.<br><em>In deiner Hand.</em>','Alle Rezepte und Bilder bleiben auf diesem Gerät. Mit einer Sicherung kannst du sie auf ein anderes Gerät mitnehmen.','')
    +`<section class="panel"><h2>Sichern & mitnehmen</h2><p>Exportiere regelmäßig eine Sicherungsdatei. Sie enthält alle Rezepte, Bilder und Kochbücher. Beim Import werden Rezepte als neue Einträge ergänzt; vorhandene Rezepte bleiben erhalten. Kochbücher mit gleichem Namen werden zusammengeführt.</p>${button('Sicherung exportieren','export','download','primary')}${button('Sicherung importieren','import','upload')}<input id="import-file" type="file" accept=".json,application/json" hidden><p class="muted">${data.recipes.length} Rezepte · ${data.books.length} Kochbücher · Sicherungsformat Version 1</p><p class="muted" id="last-backup"></p><p class="form-error" role="alert"></p></section>
    <section class="panel"><h2>Auf den Home-Bildschirm</h2><p class="muted">Kochwerk · Version 1.3.0</p><p>iPhone: Kochwerk in Safari über eine HTTPS-Adresse öffnen, im Teilen-Menü „Zum Home-Bildschirm“ wählen und „Als Web-App öffnen“ aktivieren. Danach Kochwerk über das neue Symbol starten und warten, bis „Offline bereit“ angezeigt wird.</p><p id="offline-details" class="muted"></p>${installPrompt?button('App installieren','install','plus','primary'):''}${button('Offline-Status prüfen','check-offline','check')}</section>
    <section class="panel"><h2>Lokaler Speicher</h2><p>Es gibt kein Benutzerkonto, keine Synchronisierung und keine Übertragung deiner Rezepte an einen Server. Browserdaten sind an diese Adresse und den verwendeten Browser gebunden. Ein anderer Port zählt ebenfalls als andere Adresse.</p><p>Das Löschen von Websitedaten oder das Entfernen der App kann Daten löschen. Auch das Betriebssystem kann lokalen Speicher freigeben. Eine exportierte Sicherung schützt vor Datenverlust.</p>${button('Dauerhaften Speicher anfragen','persist','check')}<p id="storage-status" class="muted"></p></section>
    <section class="panel"><h2>Einfach ausprobieren</h2><p>Vier bearbeitbare Beispielrezepte für Brot, Kuchen und die Alltagsküche. Geh- und Backzeiten sind Richtwerte.</p>${button('Beispielrezepte ergänzen','load-demo','book')}</section>`;
  try{$('#last-backup').textContent=localStorage.getItem('kochwerk-last-export')?'Zuletzt exportiert: '+new Date(localStorage.getItem('kochwerk-last-export')).toLocaleString('de-DE'): 'Noch keine Sicherung exportiert.';}catch{}
  $('#import-file').addEventListener('change',handleImport);
  updateOfflineStatus();storageStatus();
}
async function storageStatus(){try{const estimate=await navigator.storage?.estimate?.(),persistent=await navigator.storage?.persisted?.();const el=$('#storage-status');if(el)el.textContent=`${estimate?.usage!==undefined?(estimate.usage/1024/1024).toFixed(1)+' MB belegt. ':''}${persistent?'Dauerhafter Speicher wurde gewährt.':'Dauerhafter Speicher ist nicht bestätigt. Bitte regelmäßig sichern.'}`;}catch{}}
function showModal(title,body,footer=''){
  modal.innerHTML=`<div class="modal-header"><h2 id="modal-title">${title}</h2>${iconButton('close','close-modal','Dialog schließen')}</div>${body}${footer}`;
  if(!modal.open)modal.showModal();
  modal.scrollTop=0;
}
function footer(submit='Speichern'){return `<div class="modal-footer">${button('Abbrechen','close-modal')}<button type="submit" form="edit-form" class="button primary">${submit}</button></div>`;}
function openRecipeEditor(recipe){
  const {page,id}=route();
  const r=recipe??{id:uid(),title:'',description:'',minutes:30,bookIds:page==='book'?[id]:[],ingredients:[{id:uid(),name:'',amount:null,unit:''}],steps:[''],notes:'',favorite:false,photo:'',createdAt:new Date().toISOString()};
  editorPhoto=r.photo;photoLoading=false;
  showModal(recipe?'Rezept bearbeiten':'Ein neues Lieblingsrezept',`<form id="edit-form" class="modal-body" data-recipe-id="${escape(r.id)}"><p class="form-error" role="alert"></p><label class="field">Rezeptname<input name="title" value="${escape(r.title)}" required maxlength="160" placeholder="z. B. Mein Sauerteigbrot" autofocus></label><label class="field">Ein Satz zum Rezept<input name="description" value="${escape(r.description)}" maxlength="500" placeholder="Was macht es besonders?"></label><div class="form-grid"><label class="field">Rezeptzeit in Minuten<input name="minutes" type="number" min="0" max="100000" step="1" required value="${r.minutes}"><small>0 = keine Zeitangabe. Reifezeiten kannst du in den Notizen ergänzen.</small></label><div><div class="field">Rezeptbild (optional)<input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"><small>Wird auf diesem Gerät verkleinert. HEIC nur, wenn der Browser es lesen kann.</small></div></div></div><div id="photo-preview">${photoPreview()}</div><fieldset class="fieldset"><legend>In Kochbüchern sammeln</legend>${data.books.length?data.books.map(b=>`<label class="book-checkbox"><input type="checkbox" name="books" value="${escape(b.id)}" ${r.bookIds.includes(b.id)?'checked':''}>${escape(b.name)}</label>`).join(''):'<p class="muted">Du kannst Kochbücher unter „Kochbücher“ anlegen und später zuordnen.</p>'}</fieldset><div class="form-heading">Zutaten</div><p class="editor-tip">Menge und Einheit sind optional. Mit den Pfeilen ordnest du die Zutaten neu. Eingetragene Mengen kannst du später im Rezept proportional umrechnen.</p><div class="ingredients-editor-header"><span>Zutat</span><span>Menge</span><span>Einheit</span><span></span></div><div id="ingredient-rows">${r.ingredients.map(i=>ingredientRow(i)).join('')}</div>${button('Zutat hinzufügen','add-ingredient','plus')}<div class="form-heading">Zubereitung</div><div id="step-rows">${(r.steps.length?r.steps:['']).map((s,n)=>stepRow(s,n)).join('')}</div>${button('Schritt hinzufügen','add-step','plus')}<label class="field"><span class="form-heading">Notizen & Tipps</span><textarea name="notes" maxlength="10000" placeholder="Gehzeiten, Ofeneinstellung, eigene Erfahrungen …">${escape(r.notes)}</textarea></label></form>`,footer());
  updateIngredientControls();
  $('#edit-form').addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    const submit=$('button[type="submit"]',modal);submit.disabled=true;
    try{
      if(photoLoading)throw new Error('Das Bild wird noch verarbeitet. Bitte kurz warten.');
      const form=new FormData(e.target);
      const ingredients=$$('.ingredient-row',modal).map(el=>({id:el.dataset.id,name:$('[name="ingredient-name"]',el).value,amount:optionalNumberInput($('[name="ingredient-amount"]',el).value),unit:$('[name="ingredient-unit"]',el).value}));
      const candidate=validateRecipe({...r,title:form.get('title'),description:form.get('description'),minutes:numberInput(form.get('minutes')),bookIds:form.getAll('books'),ingredients,steps:$$('.step-row textarea',modal).map(el=>el.value),notes:form.get('notes'),photo:editorPhoto,updatedAt:new Date().toISOString()},data.books);
      const next=structuredClone(data),index=next.recipes.findIndex(x=>x.id===candidate.id);if(index>=0)next.recipes[index]=candidate;else next.recipes.push(candidate);
      await commit(next);modal.close();if(location.hash===`#recipe/${encodeURIComponent(candidate.id)}`)render();else location.hash=`recipe/${encodeURIComponent(candidate.id)}`;toast('Rezept lokal gespeichert.');
    }catch(err){error(err);}finally{submit.disabled=false;}
  });
  $('#photo-input').addEventListener('change',handlePhoto);
}
function ingredientRow(i){return `<div class="ingredient-row" data-id="${escape(i.id)}"><input name="ingredient-name" enterkeyhint="next" value="${escape(i.name)}" placeholder="Zutat" aria-label="Zutat" required maxlength="160"><input name="ingredient-amount" enterkeyhint="done" value="${typeof i.amount==='number'?decimalString(i.amount):''}" inputmode="decimal" placeholder="500" aria-label="Menge (optional)"><input name="ingredient-unit" enterkeyhint="done" value="${escape(i.unit)}" placeholder="g" aria-label="Einheit (optional)" maxlength="30"><div class="ingredient-actions">${iconButton('arrow','move-ingredient-up','Zutat nach oben verschieben','move-up')}${iconButton('arrow','move-ingredient-down','Zutat nach unten verschieben','move-down')}${iconButton('close','remove-ingredient','Zutat entfernen')}</div></div>`;}
function updateIngredientControls(){
  const rows=$$('.ingredient-row',modal);
  rows.forEach((row,n)=>{
    $('[data-action="move-ingredient-up"]',row).disabled=n===0;
    $('[data-action="move-ingredient-down"]',row).disabled=n===rows.length-1;
  });
}
function stepRow(text,n){return `<div class="step-row"><span class="step-number">${n+1}</span><textarea aria-label="Zubereitungsschritt ${n+1}" maxlength="5000" placeholder="Was ist zu tun?">${escape(text)}</textarea>${iconButton('close','remove-step','Schritt entfernen')}</div>`;}
function photoPreview(){return editorPhoto?`<img class="photo-preview" src="${editorPhoto}" alt="Rezeptbild-Vorschau">${button('Bild entfernen','remove-photo','trash')}`:'';}
async function handlePhoto(e){
  const file=e.target.files[0];if(!file)return;
  const owner=$('#edit-form');photoLoading=true;$('#photo-input').disabled=true;
  try{
    if(file.size>25000000)throw new Error('Bitte ein Bild unter 25 MB auswählen.');
    const url=URL.createObjectURL(file),img=new Image();
    try{img.src=url;await img.decode();const size=Math.min(1,1400/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*size));canvas.height=Math.max(1,Math.round(img.naturalHeight*size));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);let photo=canvas.toDataURL('image/jpeg',.8);if(photo.length>1500000)photo=canvas.toDataURL('image/jpeg',.5);if(photo.length>1500000)throw new Error('Das Bild ist noch zu groß. Bitte ein kleineres Bild wählen.');if(owner===$('#edit-form')){editorPhoto=photo;$('#photo-preview').innerHTML=photoPreview();}}
    finally{URL.revokeObjectURL(url);}
  }catch(err){if(owner===$('#edit-form'))error(new Error('Bild konnte nicht übernommen werden. '+(err.message||'Bitte JPEG oder PNG wählen.')));}
  finally{if(owner===$('#edit-form')){photoLoading=false;$('#photo-input').disabled=false;}}
}
function openBookEditor(book){
  const b=book??{id:uid(),name:'',color:'sage'};
  showModal(book?'Kochbuch bearbeiten':'Dein neues Kochbuch',`<form id="edit-form" class="modal-body"><p class="form-error" role="alert"></p><label class="field">Name<input name="name" value="${escape(b.name)}" required maxlength="80" placeholder="z. B. Brot & Brötchen" autofocus></label><fieldset class="fieldset"><legend>Farbe</legend><div class="color-options">${[['sage','Salbei'],['clay','Terrakotta'],['gold','Honig'],['blue','Blau']].map(([v,label])=>`<label><input type="radio" name="color" value="${v}" ${b.color===v?'checked':''}><span class="book-dot ${v}"></span>${label}</label>`).join('')}</div></fieldset>${book?button('Kochbuch löschen','delete-book','trash','danger'):''}<p class="muted">Rezepte können zu mehreren Kochbüchern gehören. Wenn du ein Kochbuch löschst, bleiben seine Rezepte in deiner Sammlung.</p></form>`,footer());
  modal.dataset.bookId=b.id;
  $('#edit-form').addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;const submit=$('button[type="submit"]',modal);submit.disabled=true;
    try{const form=new FormData(e.target),name=String(form.get('name')).trim();if(!name)throw new Error('Bitte einen Namen angeben.');if(data.books.some(x=>x.id!==b.id&&x.name.toLocaleLowerCase('de')===name.toLocaleLowerCase('de')))throw new Error('Ein Kochbuch mit diesem Namen gibt es bereits.');const next=structuredClone(data),item={...b,name,color:form.get('color')},index=next.books.findIndex(x=>x.id===b.id);if(index<0)next.books.push(item);else next.books[index]=item;await commit(next);modal.close();render();toast('Kochbuch gespeichert.');}catch(err){error(err);}finally{submit.disabled=false;}
  });
}
function confirmAction(title,text,action,label='Löschen'){
  showModal(title,`<div class="modal-body"><p class="muted">${text}</p><p class="form-error" role="alert"></p></div>`,`<div class="modal-footer">${button('Abbrechen','close-modal')}<button class="button danger" id="confirm-action">${label}</button></div>`);
  $('#confirm-action').addEventListener('click',async e=>{e.target.disabled=true;try{await action();modal.close();render();}catch(err){error(err);e.target.disabled=false;}});
}
async function exportData(){
  const current=await readData();const blob=new Blob([JSON.stringify({...current,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Kochwerk-Sicherung-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);try{localStorage.setItem('kochwerk-last-export',new Date().toISOString());}catch{}toast('Sicherungsdatei zum Speichern bereitgestellt.');if(route().page==='settings')renderSettings();
}
async function handleImport(e){
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>50000000)throw new Error('Bitte eine Sicherung unter 50 MB verwenden.');const raw=validateBackup(JSON.parse(await file.text()));confirmAction('Sicherung ergänzen?',`${raw.recipes.length} Rezepte werden als neue Einträge ergänzt. Bestehende Rezepte bleiben erhalten. Auch beim wiederholten Import entstehen zusätzliche Kopien.`,async()=>{await commit(mergeBackup(data,raw));toast('Sicherung importiert.');},'Importieren');}
  catch(err){error(new Error(err instanceof SyntaxError?'Die Datei enthält kein gültiges JSON.':err.message),main);}
  finally{e.target.value='';}
}
async function updateOfflineStatus(){
  let status,offlineReady=false;
  if(!isSecureContext)status='HTTPS oder localhost für Offline-Betrieb erforderlich.';
  else if(!('serviceWorker' in navigator))status='Dieser Browser unterstützt den Offline-Speicher nicht.';
  else{try{const reg=await navigator.serviceWorker.getRegistration();const cache=await caches.open('kochwerk-shell-v12');const complete=!!(await cache.match(new URL('./app.js',location.href)));offlineReady=!!(reg?.active&&complete);status=offlineReady?'Offline bereit · App-Dateien auf diesem Gerät gespeichert.':'Offline-Speicher noch nicht bereit. Bitte die App online neu öffnen.';}catch{status='Offline-Speicher konnte nicht geprüft werden.';}}
  $('#offline-state').textContent=status;
  $('.device-label').textContent=offlineReady?'● Offline bereit':'● Offline-Status: Daten & App';
  $('.device-label').title=status;
  if($('#offline-details'))$('#offline-details').textContent=status;
}
async function handleAction(action,el){
  const {page,id}=route(),r=data.recipes.find(r=>r.id===id);
  if(action==='close-modal'){if(photoLoading){toast('Bild wird noch verarbeitet.');return;}if($('#edit-form',modal)){confirmDiscard();}else modal.close();return;}
  if(action==='new-recipe'){openRecipeEditor();return;}
  if(action==='edit-recipe'){openRecipeEditor(r);return;}
  if(action==='new-book'){openBookEditor();return;}
  if(action==='go-books'){location.hash='books';return;}
  if(action==='edit-book'||action==='edit-current-book'){openBookEditor(data.books.find(b=>b.id===(el.dataset.id||id)));return;}
  if(action==='add-ingredient'){const rows=$$('.ingredient-row',modal);if(rows.length>=150)throw new Error('Höchstens 150 Zutaten pro Rezept.');$('#ingredient-rows').insertAdjacentHTML('beforeend',ingredientRow({id:uid(),name:'',amount:null,unit:''}));updateIngredientControls();$$('.ingredient-row',modal).at(-1).querySelector('[name="ingredient-name"]').focus();return;}
  if(action==='move-ingredient-up'||action==='move-ingredient-down'){
    const row=el.closest('.ingredient-row'),neighbor=action==='move-ingredient-up'?row.previousElementSibling:row.nextElementSibling;
    if(!neighbor)return;
    if(action==='move-ingredient-up')row.parentNode.insertBefore(row,neighbor);else neighbor.after(row);
    updateIngredientControls();
    const focus=el.disabled?$(action==='move-ingredient-up'?'[data-action="move-ingredient-down"]':'[data-action="move-ingredient-up"]',row):el;
    focus.focus();
    return;
  }
  if(action==='remove-ingredient'){if($$('.ingredient-row',modal).length===1)throw new Error('Mindestens eine Zutat ist erforderlich.');el.closest('.ingredient-row').remove();updateIngredientControls();return;}
  if(action==='add-step'){const rows=$$('.step-row',modal);if(rows.length>=150)throw new Error('Höchstens 150 Schritte.');$('#step-rows').insertAdjacentHTML('beforeend',stepRow('',rows.length));$$('.step-row textarea',modal).at(-1).focus();return;}
  if(action==='remove-step'){el.closest('.step-row').remove();$$('.step-row',modal).forEach((row,n)=>{$('.step-number',row).textContent=n+1;$('textarea',row).setAttribute('aria-label',`Zubereitungsschritt ${n+1}`);});return;}
  if(action==='remove-photo'){editorPhoto='';$('#photo-preview').innerHTML='';$('#photo-input').value='';return;}
  if(action==='favorite'||action==='favorite-detail'){const rid=el.dataset.id||id,next=structuredClone(data),item=next.recipes.find(x=>x.id===rid);if(!item)return;item.favorite=!item.favorite;await commit(next);if(page==='recipe'){el.setAttribute('aria-pressed',String(item.favorite));el.setAttribute('aria-label',item.favorite?'Favorit entfernen':'Als Favorit speichern');el.classList.toggle('is-favorite',item.favorite);}else renderResults();toast(item.favorite?'In deinen Lieblingsrezepten.':'Aus den Lieblingsrezepten entfernt.');return;}
  if(action==='reset-scale'){resetScale(r);return;}
  if(action==='copy-recipe'){const next=structuredClone(data),copy={...structuredClone(r),id:uid(),title:(r.title+' (Kopie)').slice(0,160),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};next.recipes.push(copy);await commit(next);location.hash=`recipe/${copy.id}`;toast('Rezept dupliziert.');return;}
  if(action==='delete-recipe'){confirmAction('Rezept löschen?',`„${escape(r.title)}“ wird aus deiner Sammlung und allen Kochbüchern entfernt.`,async()=>{const next=structuredClone(data);next.recipes=next.recipes.filter(x=>x.id!==id);await commit(next);location.hash='recipes';toast('Rezept gelöscht.');});return;}
  if(action==='delete-book'){const bid=modal.dataset.bookId,b=data.books.find(x=>x.id===bid);confirmAction('Kochbuch löschen?',`„${escape(b.name)}“ wird entfernt. Alle Rezepte bleiben erhalten.`,async()=>{const next=structuredClone(data);next.books=next.books.filter(x=>x.id!==bid);next.recipes.forEach(x=>x.bookIds=x.bookIds.filter(v=>v!==bid));if(bookFilter===bid)bookFilter='';await commit(next);location.hash='books';toast('Kochbuch gelöscht.');});return;}
  if(action==='load-demo'){confirmAction('Beispielrezepte laden?','Vier Rezepte und passende Kochbücher werden ergänzt. Du kannst alle Beispiele bearbeiten oder löschen.',async()=>{await commit(mergeBackup(data,demoData()));toast('Beispielrezepte hinzugefügt.');},'Beispiele laden');return;}
  if(action==='export'){await exportData();return;}
  if(action==='import'){$('#import-file').click();return;}
  if(action==='persist'){if(navigator.storage?.persist){const granted=await navigator.storage.persist();toast(granted?'Dauerhafter Speicher gewährt.':'Der Browser hat dauerhaften Speicher nicht gewährt.');await storageStatus();}else toast('Diese Funktion wird vom Browser nicht angeboten.');return;}
  if(action==='check-offline'){await updateOfflineStatus();return;}
  if(action==='install'){if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;render();}return;}
  if(action==='print'){if($('[data-quantity][aria-invalid="true"]'))throw new Error('Bitte vor dem Drucken eine gültige Zutatenmenge eingeben oder die Originalmengen wiederherstellen.');window.print();return;}
}
function confirmDiscard(){
  // Preserve the live form and all entered values while a small confirmation is displayed.
  if($('#discard-confirm',modal))return;
  const box=document.createElement('div');box.className='modal-body error-banner';box.id='discard-confirm';box.innerHTML='<p>Bearbeitung ohne Speichern schließen?</p><div class="empty-actions"><button class="button" id="keep-editing">Weiter bearbeiten</button><button class="button danger" id="discard-editing">Verwerfen</button></div>';modal.prepend(box);box.scrollIntoView({block:'start'});$('#keep-editing').onclick=()=>box.remove();$('#discard-editing').onclick=()=>modal.close();$('#keep-editing').focus();
}
document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(el){e.preventDefault();Promise.resolve(handleAction(el.dataset.action,el)).catch(err=>error(err));}});
// Finish single-line input without submitting; ingredient names advance within their own row.
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'||e.isComposing)return;
  const input=e.target;
  if(input.tagName!=='INPUT'||['button','submit','reset','file','checkbox','radio','range','color','hidden'].includes(input.type))return;
  e.preventDefault();
  const amount=input.form?.id==='edit-form'&&input.name==='ingredient-name'
    ?input.closest('.ingredient-row')?.querySelector('[name="ingredient-amount"]'):null;
  if(amount&&!amount.disabled){amount.focus();amount.select();}
  else input.blur();
});
modal.addEventListener('cancel',e=>{if($('#edit-form',modal)){e.preventDefault();confirmDiscard();}});
window.addEventListener('hashchange',()=>{if(modal.open)modal.close();render();window.scrollTo(0,0);main.focus({preventScroll:true});});
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#recipe/"]');if(a)routeReturn=location.hash||'#recipes';});
channel?.addEventListener('message',async()=>{if(modal.open){toast('Anderes Fenster hat Daten geändert. Bitte vor weiteren Änderungen neu laden.');return;}try{data=await readData();updateSidebar();render();toast('Änderungen aus anderem Fenster übernommen.');}catch(e){error(e);}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;if(ready&&route().page==='settings')render();});
window.addEventListener('beforeunload',e=>{if(modal.open&&$('#edit-form',modal)){e.preventDefault();e.returnValue='';}});
async function start(){
  renderCookingMode();
  $$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
  if(location.protocol==='file:'){main.innerHTML='<div class="error-banner"><strong>Bitte über localhost oder HTTPS öffnen.</strong><p>Ein Doppelklick auf index.html unterstützt weder die App-Module noch den Offline-Speicher zuverlässig. Verwende Start-Windows.cmd oder die beiliegende Anleitung.</p></div>';return;}
  try{data=await readData();ready=true;updateSidebar();render();}catch(e){main.innerHTML=`<div class="error-banner"><strong>Kochbuch konnte nicht geöffnet werden.</strong><p>${escape(e.message)}</p><p>Bitte normalen Browsermodus verwenden und lokalen Speicher erlauben. Vorhandene Daten werden nicht überschrieben.</p><button class="button" id="reload">Erneut versuchen</button></div>`;$('#reload').onclick=()=>location.reload();}
  cookingLifecycle.start();
  if(isSecureContext&&'serviceWorker' in navigator){try{const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./'});reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){updateOfflineStatus();if(navigator.serviceWorker.controller)toast('App-Update bereit. Alle Kochwerk-Fenster schließen und erneut öffnen.');}});});navigator.serviceWorker.addEventListener('controllerchange',updateOfflineStatus);}catch{toast('Offline-Speicher konnte nicht eingerichtet werden.');}}
  await updateOfflineStatus();
}
start();



