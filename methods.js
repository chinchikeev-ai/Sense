const methodsForm=document.querySelector('#methodsForm'),methodsStatus=document.querySelector('#methodsStatus'),saveMethods=document.querySelector('#saveMethods');
let methodRows=[],methodsRevision=0,methodsDirty=false,methodsSaving=false;

function renderMethods(){
  const cards=document.querySelector('#methodCards');cards.replaceChildren();
  methodRows.forEach(method=>{
    const card=document.createElement('section');card.className='panel';
    const heading=document.createElement('h3');heading.textContent=method.label;card.append(heading);
    const parameters=document.createElement('div');parameters.className='method-parameters';
    for(const [key,label] of [['days','Срок доставки, дней'],['totalWeight','Общая масса, кг'],['totalVolume','Общий объём, м³']]){
      const field=document.createElement('div');field.className='field';const title=document.createElement('label'),input=document.createElement('input');
      input.id='method-'+method.id+'-'+key;title.htmlFor=input.id;title.textContent=label;input.value=method[key]??'';
      if(key==='days'){input.maxLength=100;input.placeholder='Например, 18–25'}else{input.type='number';input.min='0';input.max='1000000000';input.step='any';input.placeholder='Не указано'}
      input.addEventListener('input',()=>{method[key]=key==='days'?input.value:input.value===''?null:Number(input.value);methodsDirty=true;saveMethods.disabled=methodsSaving;methodsStatus.textContent='Есть несохранённые изменения.'});field.append(title,input);parameters.append(field);
    }
    card.append(parameters);
    for(const [key,label,max] of [['label','Название кнопки и пункта списка',40],['title','Заголовок',120],['description','Описание доставки',2000],['comment','Комментарий: срок, вес и объём',1000]]){
      const field=document.createElement('div');field.className='field';const title=document.createElement('label'),input=document.createElement(['description','comment'].includes(key)?'textarea':'input');
      input.id='method-'+method.id+'-'+key;title.htmlFor=input.id;title.textContent=label;input.value=method[key]||'';input.maxLength=max;input.required=['label','title'].includes(key);
      if(key==='comment')input.placeholder='Например: срок, минимальный вес, объём, особенности перевозки';
      input.addEventListener('input',()=>{method[key]=input.value;methodsDirty=true;saveMethods.disabled=methodsSaving;methodsStatus.textContent='Есть несохранённые изменения.'});field.append(title,input);card.append(field);
    }
    cards.append(card);
  });
}
const adminTabs=[...document.querySelectorAll('.admin-tabs [role=tab]')];
function selectAdminTab(tab){adminTabs.forEach(item=>{const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!selected});}
adminTabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectAdminTab(tab));tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?adminTabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+adminTabs.length)%adminTabs.length;selectAdminTab(adminTabs[next]);adminTabs[next].focus()})});
methodsForm.addEventListener('submit',async event=>{
  event.preventDefault();if(methodsSaving||!methodsForm.reportValidity())return;
  methodsSaving=true;methodsForm.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=true);methodsStatus.textContent='Сохраняем…';
  try{const response=await fetch('./api/admin/methods',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:methodsRevision,rows:methodRows})});const data=await response.json();if(!response.ok)throw Error(data.error||'Не удалось сохранить');methodRows=data.rows;methodsRevision=data.revision;methodsDirty=false;renderMethods();updateMethodNames(methodRows);render();methodsStatus.textContent='Сохранено. Названия и тексты на сайте обновлены.';}catch(error){methodsStatus.textContent=error.message;}finally{methodsSaving=false;methodsForm.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=false);saveMethods.disabled=!methodsDirty;}
});
window.addEventListener('beforeunload',event=>{if(methodsDirty){event.preventDefault();event.returnValue=''}});
(async()=>{try{const response=await fetch('./api/admin/methods',{cache:'no-store'});if(!response.ok)throw Error('Не удалось загрузить способы доставки.');const data=await response.json();methodRows=data.rows;methodsRevision=data.revision;renderMethods();updateMethodNames(methodRows);if(loaded)render();methodsStatus.textContent='Редактируйте тексты и нажмите «Сохранить способы доставки».';}catch(error){methodsStatus.textContent=error.message;}})();
