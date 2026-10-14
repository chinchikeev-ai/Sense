const body=document.querySelector('#tariffRows'),status=document.querySelector('#adminStatus'),save=document.querySelector('#saveRows');
const methodNames={auto:'Авто',rail:'ЖД',sea:'Море'};
const rowReferences=new WeakMap(),collator=new Intl.Collator('ru',{numeric:true,sensitivity:'base'});
const filterIds=['filter','methodFilter','originFilter','destinationFilter'];
let sortKey='origin',sortAscending=true;
let rows=[],revision=0,dirty=false,saving=false,loaded=false;
function markDirty(){dirty=true;save.disabled=saving;status.textContent='Есть несохранённые изменения.'}
function cellInput(row,index,key,type='text'){
  const td=document.createElement('td'),input=document.createElement('input');
  input.type=type;input.value=row[key]??'';input.setAttribute('aria-label',({origin:'Город отправления',destination:'Город доставки',perKg:'Ставка за кг',perM3:'Ставка за м³',deliveryCost:'Стоимость доставки',days:'Срок доставки'})[key]+' — строка '+(index+1));
  if(type==='number'){input.min='0';input.max='100000000';input.step='.01';input.placeholder=key==='deliveryCost'?'Не указано':'По запросу'}else{input.maxLength=100;input.required=key!=='days'}
  input.addEventListener('input',()=>{row[key]=type==='number'?(input.value===''?null:Number(input.value)):input.value;markDirty()});input.addEventListener('change',refreshFilterOptions);td.append(input);return td;
}
function refreshFilterOptions(){
  for(const [id,key] of [['originFilter','origin'],['destinationFilter','destination']]){
    const select=document.querySelector('#'+id),selected=select.value;
    const choices=[...new Set([...rows.map(row=>row[key].trim()).filter(Boolean),...(selected?[selected]:[])])].sort(collator.compare);
    select.replaceChildren(new Option('Все города',''),...choices.map(value=>new Option(value,value)));select.value=selected;
  }
}
function compareRows(a,b){
  const left=a.row[sortKey],right=b.row[sortKey],emptyLeft=left==null||left==='',emptyRight=right==null||right==='';
  if(emptyLeft!==emptyRight)return emptyLeft?1:-1;
  let comparison=0;
  if(!emptyLeft){comparison=['perKg','perM3','deliveryCost'].includes(sortKey)?left-right:collator.compare(sortKey==='method'?methodNames[left]:left,sortKey==='method'?methodNames[right]:right)}
  return (sortAscending?comparison:-comparison)||a.index-b.index;
}
function updateSortLabels(){
  document.querySelector('#sortBy').value=sortKey;document.querySelector('#sortDirection').textContent=sortAscending?'↑ По возрастанию':'↓ По убыванию';
  document.querySelectorAll('[data-sort]').forEach(button=>{const active=button.dataset.sort===sortKey;button.closest('th').setAttribute('aria-sort',active?(sortAscending?'ascending':'descending'):'none');button.querySelector('span').textContent=active?(sortAscending?'↑':'↓'):'↕'});
}
function render(){
  refreshFilterOptions();updateSortLabels();body.replaceChildren();rows.map((row,index)=>({row,index})).sort(compareRows).forEach(({row,index})=>{
    const tr=document.createElement('tr'),typeCell=document.createElement('td'),select=document.createElement('select');
    rowReferences.set(tr,row);
    Object.entries(methodNames).forEach(([value,label])=>{const option=new Option(label,value);option.selected=row.method===value;select.add(option)});
    select.setAttribute('aria-label','Тип доставки — строка '+(index+1));select.addEventListener('change',()=>{row.method=select.value;markDirty()});typeCell.append(select);tr.append(typeCell);
    tr.append(cellInput(row,index,'origin'),cellInput(row,index,'destination'),cellInput(row,index,'perKg','number'),cellInput(row,index,'perM3','number'),cellInput(row,index,'deliveryCost','number'),cellInput(row,index,'days'));
    const actions=document.createElement('td'),remove=document.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='Удалить';remove.setAttribute('aria-label','Удалить маршрут '+row.origin+' — '+row.destination);remove.addEventListener('click',()=>{rows.splice(index,1);markDirty();render()});actions.append(remove);tr.append(actions);body.append(tr);
  });filterRows();
}
function filterRows(){
  const query=document.querySelector('#filter').value.toLocaleLowerCase('ru').trim(),method=document.querySelector('#methodFilter').value,origin=document.querySelector('#originFilter').value,destination=document.querySelector('#destinationFilter').value;
  let visible=0;[...body.children].forEach(tr=>{const row=rowReferences.get(tr);tr.hidden=!( (!method||row.method===method)&&(!origin||row.origin.trim()===origin)&&(!destination||row.destination.trim()===destination)&&`${methodNames[row.method]} ${row.origin} ${row.destination}`.toLocaleLowerCase('ru').includes(query) );if(!tr.hidden)visible++});
  document.querySelector('#rowCount').textContent=`Показано ${visible} из ${rows.length} маршрутов${visible===0?' — измените или сбросьте фильтры.':'.'}`;
}
function clearFilters(){filterIds.forEach(id=>document.querySelector('#'+id).value='');filterRows()}
document.querySelector('#filter').addEventListener('input',filterRows);
filterIds.slice(1).forEach(id=>document.querySelector('#'+id).addEventListener('change',filterRows));
document.querySelector('#clearFilters').addEventListener('click',clearFilters);
document.querySelector('#sortBy').addEventListener('change',event=>{if(saving)return;sortKey=event.target.value;render()});
document.querySelector('#sortDirection').addEventListener('click',()=>{if(saving)return;sortAscending=!sortAscending;render()});
document.querySelectorAll('[data-sort]').forEach(button=>button.addEventListener('click',()=>{if(saving)return;if(sortKey===button.dataset.sort)sortAscending=!sortAscending;else{sortKey=button.dataset.sort;sortAscending=true}render()}));
function revealInvalidRows(){if([...body.querySelectorAll('input,select')].some(input=>!input.validity.valid))clearFilters()}
save.addEventListener('click',revealInvalidRows);
document.querySelector('#tariffForm').addEventListener('invalid',revealInvalidRows,true);
document.querySelector('#addRow').addEventListener('click',()=>{if(!loaded||saving)return;clearFilters();const row={method:'auto',origin:'',destination:'',perKg:null,perM3:null,deliveryCost:null,days:''};rows.push(row);markDirty();render();[...body.children].find(tr=>rowReferences.get(tr)===row).querySelector('input').focus()});
document.querySelector('#tariffForm').addEventListener('submit',async event=>{
  event.preventDefault();if(!loaded||saving)return;
  // A filtered-out invalid row must be visible for native form validation.
  revealInvalidRows();if(!event.currentTarget.reportValidity())return;
  saving=true;save.disabled=true;document.querySelector('#addRow').disabled=true;body.querySelectorAll('input,select,button').forEach(el=>el.disabled=true);status.textContent='Сохраняем…';
  try{const response=await fetch('./api/admin/tariffs',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,rows})});const data=await response.json();if(!response.ok)throw Error(data.error||'Не удалось сохранить');rows=data.rows;revision=data.revision;dirty=false;render();status.textContent='Сохранено. Тарифы на сайте обновлены.';}catch(error){status.textContent=error.message;}finally{saving=false;save.disabled=!dirty;document.querySelector('#addRow').disabled=false;body.querySelectorAll('input,select,button').forEach(el=>el.disabled=false);}
});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=''}});
(async()=>{try{const response=await fetch('./api/admin/tariffs',{cache:'no-store'});if(!response.ok)throw Error('Не удалось загрузить тарифы. Проверьте вход.');const data=await response.json();rows=data.rows;revision=data.revision;loaded=true;render();status.textContent=`Маршрутов: ${rows.length}. Вы можете редактировать, добавлять и удалять строки.`;}catch(error){status.textContent=error.message;}})();
