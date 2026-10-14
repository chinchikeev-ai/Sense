const citiesForm=document.querySelector('#citiesForm'),citiesStatus=document.querySelector('#citiesStatus'),saveCities=document.querySelector('#saveCities');
let cityRows=[],citiesRevision=0,citiesDirty=false,citiesSaving=false;
function markCitiesDirty(){citiesDirty=true;saveCities.disabled=citiesSaving;citiesStatus.textContent='Есть несохранённые изменения.'}
function renderCities(){
  for(const kind of ['origin','destination']){
    const body=document.querySelector('#cities-'+kind);body.replaceChildren();
    cityRows.filter(city=>city.kind===kind).forEach(city=>{
      const tr=document.createElement('tr');tr.city=city;
      for(const [key,label] of [['name','Город'],['country','Страна'],['comment','Комментарий']]){
        const td=document.createElement('td'),input=document.createElement('input');input.value=city[key]||'';input.required=key!=='comment';input.maxLength=key==='comment'?1000:100;input.setAttribute('aria-label',label+' — '+(city.name||'новый город'));input.addEventListener('input',()=>{city[key]=input.value;markCitiesDirty()});td.append(input);tr.append(td);
      }
      const activeCell=document.createElement('td'),label=document.createElement('label'),active=document.createElement('input');active.type='checkbox';active.checked=city.active;active.setAttribute('aria-label','Доступен на сайте — '+(city.name||'новый город'));active.addEventListener('change',()=>{city.active=active.checked;markCitiesDirty()});label.className='city-active';label.append(active,document.createTextNode('На сайте'));activeCell.append(label);tr.append(activeCell);
      const routes=document.createElement('td');routes.textContent=city.routes||0;tr.append(routes);
      const actions=document.createElement('td'),remove=document.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='Удалить';remove.disabled=!!city.routes;remove.dataset.used=String(!!city.routes);remove.title=city.routes?'Город используется в маршрутах. Его можно отключить на сайте.':'Удалить город';remove.addEventListener('click',()=>{cityRows.splice(cityRows.indexOf(city),1);markCitiesDirty();renderCities()});actions.append(remove);tr.append(actions);body.append(tr);
    });
  }
  filterCities();
}
function filterCities(){const query=document.querySelector('#citySearch').value.trim().toLocaleLowerCase('ru');let visible=0;document.querySelectorAll('.city-table tbody tr').forEach(tr=>{tr.hidden=!`${tr.city.name} ${tr.city.country} ${tr.city.comment}`.toLocaleLowerCase('ru').includes(query);if(!tr.hidden)visible++});document.querySelector('#cityCount').textContent=`Показано ${visible} из ${cityRows.length} городов.`;}
document.querySelector('#citySearch').addEventListener('input',filterCities);
document.querySelectorAll('[data-add-city]').forEach(button=>button.addEventListener('click',()=>{if(citiesSaving||!citiesRevision)return;const kind=button.dataset.addCity,row={id:null,kind,name:'',country:kind==='origin'?'Китай':'Россия',active:true,comment:'',routes:0};cityRows.push(row);document.querySelector('#citySearch').value='';markCitiesDirty();renderCities();[...document.querySelector('#cities-'+kind).children].find(tr=>tr.city===row).querySelector('input').focus()}));
function revealInvalidCities(){if([...citiesForm.querySelectorAll('input')].some(input=>!input.validity.valid)){document.querySelector('#citySearch').value='';filterCities()}}
saveCities.addEventListener('click',revealInvalidCities);citiesForm.addEventListener('invalid',revealInvalidCities,true);
citiesForm.addEventListener('submit',async event=>{
  event.preventDefault();if(citiesSaving||!citiesRevision||!citiesForm.reportValidity())return;if(saving){citiesStatus.textContent='Дождитесь сохранения тарифов.';return;}
  citiesSaving=true;citiesForm.querySelectorAll('input,button').forEach(el=>el.disabled=true);citiesStatus.textContent='Сохраняем…';
  try{const response=await fetch('./api/admin/cities',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:citiesRevision,rows:cityRows})});const data=await response.json();if(!response.ok)throw Error(data.error||'Не удалось сохранить города');cityRows=data.rows;citiesRevision=data.revision;citiesDirty=false;renderCities();updateCityOptions(cityRows);citiesStatus.textContent='Сохранено. Списки городов на сайте обновлены.';
    if(!dirty){const response=await fetch('./api/admin/tariffs',{cache:'no-store'});if(response.ok){const data=await response.json();if(!dirty&&!saving){rows=data.rows;revision=data.revision;updateCityOptions(data.cities);render();}}}else{citiesStatus.textContent+=' В таблице тарифов есть несохранённые правки; при переименовании города её нужно перезагрузить.'}
  }catch(error){citiesStatus.textContent=error.message;}finally{citiesSaving=false;citiesForm.querySelectorAll('input,button').forEach(el=>el.disabled=false);citiesForm.querySelectorAll('button[data-used=true]').forEach(el=>el.disabled=true);saveCities.disabled=!citiesDirty;}
});
window.addEventListener('beforeunload',event=>{if(citiesDirty){event.preventDefault();event.returnValue=''}});
(async()=>{try{const response=await fetch('./api/admin/cities',{cache:'no-store'});if(!response.ok)throw Error('Не удалось загрузить города.');const data=await response.json();cityRows=data.rows;citiesRevision=data.revision;renderCities();updateCityOptions(cityRows);citiesStatus.textContent='Можно добавлять города, переименовывать и включать их на сайте.';}catch(error){citiesStatus.textContent=error.message;}})();
