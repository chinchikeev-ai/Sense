const body=document.querySelector('#tariffRows'),status=document.querySelector('#adminStatus'),save=document.querySelector('#saveRows');
const methodNames={auto:'Авто',rail:'ЖД',sea:'Море'};
let rows=[],revision=0,dirty=false,saving=false,loaded=false;
function markDirty(){dirty=true;save.disabled=saving;status.textContent='Есть несохранённые изменения.'}
function cellInput(row,index,key,type='text'){
  const td=document.createElement('td'),input=document.createElement('input');
  input.type=type;input.value=row[key]??'';input.setAttribute('aria-label',({origin:'Город отправления',destination:'Город доставки',perKg:'Ставка за кг',perM3:'Ставка за м³',days:'Срок доставки'})[key]+' — строка '+(index+1));
  if(type==='number'){input.min='0';input.max='100000000';input.step='.01';input.placeholder='По запросу'}else{input.maxLength=100;input.required=key!=='days'}
  input.addEventListener('input',()=>{row[key]=type==='number'?(input.value===''?null:Number(input.value)):input.value;markDirty()});td.append(input);return td;
}
function render(){
  body.replaceChildren();rows.forEach((row,index)=>{
    const tr=document.createElement('tr'),typeCell=document.createElement('td'),select=document.createElement('select');
    Object.entries(methodNames).forEach(([value,label])=>{const option=new Option(label,value);option.selected=row.method===value;select.add(option)});
    select.setAttribute('aria-label','Тип доставки — строка '+(index+1));select.addEventListener('change',()=>{row.method=select.value;markDirty()});typeCell.append(select);tr.append(typeCell);
    tr.append(cellInput(row,index,'origin'),cellInput(row,index,'destination'),cellInput(row,index,'perKg','number'),cellInput(row,index,'perM3','number'),cellInput(row,index,'days'));
    const actions=document.createElement('td'),remove=document.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='Удалить';remove.setAttribute('aria-label','Удалить маршрут '+row.origin+' — '+row.destination);remove.addEventListener('click',()=>{rows.splice(index,1);markDirty();render()});actions.append(remove);tr.append(actions);body.append(tr);
  });filterRows();
}
function filterRows(){const query=document.querySelector('#filter').value.toLocaleLowerCase('ru').trim();[...body.children].forEach((tr,index)=>{const row=rows[index];tr.hidden=!`${methodNames[row.method]} ${row.origin} ${row.destination}`.toLocaleLowerCase('ru').includes(query)})}
document.querySelector('#filter').addEventListener('input',filterRows);
save.addEventListener('click',()=>{document.querySelector('#filter').value='';filterRows()});
document.querySelector('#addRow').addEventListener('click',()=>{if(!loaded||saving)return;document.querySelector('#filter').value='';rows.push({method:'auto',origin:'',destination:'',perKg:null,perM3:null,days:''});markDirty();render();body.lastElementChild.querySelector('input').focus()});
document.querySelector('#tariffForm').addEventListener('submit',async event=>{
  event.preventDefault();if(!loaded||saving)return;
  // A filtered-out invalid row must be visible for native form validation.
  document.querySelector('#filter').value='';filterRows();if(!event.currentTarget.reportValidity())return;
  saving=true;save.disabled=true;document.querySelector('#addRow').disabled=true;body.querySelectorAll('input,select,button').forEach(el=>el.disabled=true);status.textContent='Сохраняем…';
  try{const response=await fetch('./api/admin/tariffs',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,rows})});const data=await response.json();if(!response.ok)throw Error(data.error||'Не удалось сохранить');rows=data.rows;revision=data.revision;dirty=false;render();status.textContent='Сохранено. Тарифы на сайте обновлены.';}catch(error){status.textContent=error.message;}finally{saving=false;save.disabled=!dirty;document.querySelector('#addRow').disabled=false;body.querySelectorAll('input,select,button').forEach(el=>el.disabled=false);}
});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=''}});
(async()=>{try{const response=await fetch('./api/admin/tariffs',{cache:'no-store'});if(!response.ok)throw Error('Не удалось загрузить тарифы. Проверьте вход.');const data=await response.json();rows=data.rows;revision=data.revision;loaded=true;render();status.textContent=`Маршрутов: ${rows.length}. Вы можете редактировать, добавлять и удалять строки.`;}catch(error){status.textContent=error.message;}})();
