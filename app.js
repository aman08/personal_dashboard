const $ = (s) => document.querySelector(s);
const categories = ['Food & dining','Shopping','Transport','Utilities','Health','Travel','Other'];
const money = (v) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v);
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const escape = (v) => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let db, entries=[], editing=null, pending=[], toastTimer;
function toast(message){ $('#toast').textContent=message; $('#toast').style.display='block'; clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').style.display='none',4500); }
const request = indexedDB.open('ledger-finance',1);
request.onupgradeneeded = () => request.result.createObjectStore('expenses',{keyPath:'id'});
request.onerror = () => { toast('Browser storage is unavailable. Enable storage to save expenses.'); $('#add').disabled=true; $('#files').disabled=true; };
request.onsuccess = async () => { db=request.result; db.onversionchange=()=>db.close(); await refresh(); };
function operation(method,value){return new Promise((resolve,reject)=>{ const tx=db.transaction('expenses',method==='getAll'?'readonly':'readwrite');const req=tx.objectStore('expenses')[method](value);tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error); });}
async function refresh(){ try { entries=await operation('getAll'); render(); } catch {toast('Could not read saved expenses.');} }
for(const c of categories){$('#filter').add(new Option(c,c));$('#edit-category').add(new Option(c,c));}
function render(){const total=entries.reduce((sum,e)=>sum+e.amount,0);const month=entries.filter(e=>e.date.startsWith(today().slice(0,7))).reduce((sum,e)=>sum+e.amount,0);const unpaid=entries.filter(e=>e.type==='Invoice'&&e.status==='Unpaid');$('#total').textContent=money(total);$('#month').textContent=money(month);$('#month-label').textContent=new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'});$('#unpaid').textContent=money(unpaid.reduce((sum,e)=>sum+e.amount,0));$('#unpaid-count').textContent=`${unpaid.length} awaiting payment`;$('#count').textContent=entries.filter(e=>e.file).length;
 const grouped=categories.map(c=>[c,entries.filter(e=>e.category===c).reduce((s,e)=>s+e.amount,0)]).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);$('#categories').innerHTML=grouped.length?grouped.map(([c,v])=>`<div class="category"><div class="category-line"><span>${escape(c)}</span><strong>${money(v)}</strong></div><div class="bar"><span style="width:${v/total*100}%"></span></div></div>`).join(''):'<div class="empty"><span>◔</span><h3>See the bigger picture</h3><p>Your spending categories will appear here.</p></div>';
 const query=$('#search').value.toLowerCase();const filter=$('#filter').value;const visible=entries.filter(e=>(!filter||e.category===filter)&&`${e.merchant} ${e.file?.name||''} ${e.notes}`.toLowerCase().includes(query)).sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created);$('#rows').innerHTML=visible.map(e=>`<tr><td><span class="merchant">${escape(e.merchant)}</span><span class="doc-name">${escape(e.file?.name||'Manual expense')}</span></td><td>${escape(e.category)}</td><td>${new Date(e.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td><td><span class="pill ${e.status==='Unpaid'?'unpaid':''}">${escape(e.status)}</span></td><td class="right merchant">${money(e.amount)}</td><td><div class="row-actions">${e.file?`<button class="secondary" data-download="${e.id}">File ↓</button>`:''}<button class="secondary" data-edit="${e.id}">Edit</button></div></td></tr>`).join('');$('#empty').hidden=visible.length>0;$('#empty h3').textContent=entries.length?'No matching expenses':'A fresh start for your finances';$('#empty p').textContent=entries.length?'Try another search or category.':'Upload your first receipt or add an expense to see it here.';}
function openEditor(entry=null,file=null){if(!db){toast('Storage is still loading. Please try again.');return;}editing=entry?{...entry}: {id:crypto.randomUUID(),created:Date.now(),file};$('#form').reset();$('#extract').hidden=!(file||entry?.file);$('#extract').disabled=false;$('#extract-status').textContent='';$('#dialog-title').textContent=entry?'Edit expense':file?'Review document':'Add expense';$('#filename').textContent=file?.name||entry?.file?.name||'Enter your expense details.';const f=$('#form').elements;f.merchant.value=entry?.merchant||'';f.amount.value=entry?.amount||'';f.date.value=entry?.date||today();f.category.value=entry?.category||categories[0];f.type.value=entry?.type||'Receipt';f.status.value=entry?.status||'Paid';f.notes.value=entry?.notes||'';$('#remove').hidden=!entry;$('#editor').showModal();}
function nextUpload(){if(pending.length)openEditor(null,pending.shift());}
function closeEditor(){ $('#editor').close();editing=null;nextUpload(); }
$('#add').onclick=()=>openEditor();$('#cancel').onclick=closeEditor;$('#editor').addEventListener('cancel',e=>{e.preventDefault();closeEditor();});
$('#form').onsubmit=async e=>{e.preventDefault();const f=e.target.elements;const amount=Number(f.amount.value);const merchant=f.merchant.value.trim();if(!merchant||!Number.isFinite(amount)||amount<=0){toast('Enter a merchant and a positive amount.');return;}const entry={...editing,merchant,amount,date:f.date.value,category:f.category.value,type:f.type.value,status:f.status.value,notes:f.notes.value.trim()};const save=e.submitter;save.disabled=true;try{await operation('put',entry);await refresh();toast('Expense saved');closeEditor();}catch{toast('Could not save. Browser storage may be full.');}finally{save.disabled=false;}};
$('#remove').onclick=async()=>{if(!confirm('Delete this expense and its stored document?'))return;try{await operation('delete',editing.id);await refresh();closeEditor();toast('Expense deleted');}catch{toast('Could not delete expense.');}};
function upload(files){if(!db){toast('Storage is still loading. Please try again.');return;}let rejected=0;for(const file of files){if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024||file.size===0){rejected++;continue;}pending.push(file);}if(rejected)toast(`${rejected} file(s) skipped. Use PDF, JPG, PNG, or WEBP up to 10 MB.`);if(!$('#editor').open)nextUpload();}
$('#files').onchange=e=>{upload(e.target.files);e.target.value='';};for(const event of ['dragenter','dragover'])$('#drop').addEventListener(event,e=>{e.preventDefault();$('#drop').classList.add('drag');});for(const event of ['dragleave','drop'])$('#drop').addEventListener(event,e=>{e.preventDefault();$('#drop').classList.remove('drag');if(event==='drop')upload(e.dataTransfer.files);});
$('#search').oninput=render;$('#filter').onchange=render;
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#rows').onclick=e=>{const edit=e.target.closest('[data-edit]');const file=e.target.closest('[data-download]');if(edit)openEditor(entries.find(x=>x.id===edit.dataset.edit));if(file){const entry=entries.find(x=>x.id===file.dataset.download);download(entry.file,entry.file.name);}};
$('#export').onclick=()=>{if(!entries.length){toast('Add an expense before exporting.');return;}const cell=v=>`"${String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')}"`;const rows=[['Merchant','Amount (USD)','Date','Category','Type','Status','Notes','Document'],...entries.map(e=>[e.merchant,e.amount,e.date,e.category,e.type,e.status,e.notes,e.file?.name||''])];download(new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'ledger-expenses.csv');};
render();

$('#extract').onclick=async()=>{
 const target=editing;const button=$('#extract');button.disabled=true;$('#extract-status').textContent='Reading your document…';
 try {
   const response=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':target.file.type},body:target.file});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Extraction failed.');
   if(editing!==target)return;
   const f=$('#form').elements;f.merchant.value=result.merchant||'';
   const usd=result.currency==='USD';f.amount.value=usd&&Number.isFinite(result.amount)&&result.amount>0?result.amount:'';
   if(result.date&&/^\d{4}-\d{2}-\d{2}$/.test(result.date))f.date.value=result.date;else f.date.value='';
   if(categories.includes(result.category))f.category.value=result.category;
   if(['Receipt','Invoice'].includes(result.type))f.type.value=result.type;
   f.status.value=result.type==='Invoice'?'Unpaid':'Paid';f.notes.value=result.notes||'';
   $('#extract-status').textContent=usd?'Details extracted. Verify every field and payment status before saving.':`Currency: ${result.currency||'unknown'}. Enter the amount in USD and verify all details before saving.`;
 }catch(error){if(editing===target)$('#extract-status').textContent=error.message;}
 finally{if(editing===target)button.disabled=false;}
};
