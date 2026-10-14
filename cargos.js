(()=>{
 const form=document.querySelector('#homeCalcForm');if(!form)return;
 const list=document.createElement('div');list.className='cargo-list';list.id='cargoList';
 const controls=document.createElement('div');controls.className='cargo-list-controls';const add=document.createElement('button');add.type='button';add.className='button secondary';add.textContent='+ Добавить груз';const totals=document.createElement('p');totals.className='cargo-totals';totals.id='cargoTotals';controls.append(add,totals);form.querySelector('.fields').replaceWith(list,controls);
 function render(items){list.replaceChildren();items.forEach((item,index)=>{
  const card=document.createElement('section');card.className='cargo-item';card.dataset.cargoItem='';const head=document.createElement('div');head.className='cargo-item-head';const heading=document.createElement('h3');heading.textContent='Груз '+(index+1);head.append(heading);
  if(items.length>1){const remove=document.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='Удалить';remove.setAttribute('aria-label','Удалить груз '+(index+1));remove.addEventListener('click',()=>{const current=collectHomeCargo();current.splice(index,1);render(current)});head.append(remove)}card.append(head);
  const fields=document.createElement('div');fields.className='fields';for(const [key,label,legacy] of [['name','Наименование товара','homeCargoName'],['weight','Вес, кг','homeWeight'],['volume','Объём, м³','homeVolume'],['tnved','ТН ВЭД','homeTnved']]){
   const field=document.createElement('div');field.className='field';const title=document.createElement('label'),input=document.createElement('input');input.dataset.cargoField=key;input.id=index===0?legacy:'cargo-'+index+'-'+key;title.htmlFor=input.id;title.textContent=label;input.value=item[key]??'';
   if(['weight','volume'].includes(key)){input.type='number';input.min='.01';input.max=key==='weight'?'10000000':'100000';input.step='any';input.required=true;input.placeholder=key==='weight'?'кг':'м³';if(!item[key])input.value=''}else{input.maxLength=key==='tnved'?14:200;input.placeholder=key==='name'?'Например, электроника':'Код, если известен';if(key==='tnved'){input.inputMode='numeric';input.pattern='[0-9 ]{10,14}'}}
   field.append(title,input);fields.append(field);
  }card.append(fields);
  const extra=document.createElement('details');extra.className='cargo-extra';extra.innerHTML='<summary>Дополнительные параметры</summary><label>Тип упаковки<select data-cargo-packaging><option value="">Не указано</option><option>Коробки</option><option>Палеты</option><option>Ящики</option><option>Без упаковки</option><option>Другое</option></select></label><label>Особые условия перевозки<input data-cargo-notes maxlength="300" placeholder="Хрупкий груз, температурный режим и т. д."></label>';
  extra.querySelector('[data-cargo-packaging]').value=item.packaging||'';
  extra.querySelector('[data-cargo-notes]').value=item.notes||'';
  card.append(extra);
  const insight=document.createElement('div');insight.className='cargo-insight';insight.setAttribute('aria-live','polite');card.append(insight);
  const updateInsight=()=>{const w=Number(card.querySelector('[data-cargo-field=weight]').value),v=Number(card.querySelector('[data-cargo-field=volume]').value);insight.textContent=w>0&&v>0?'Плотность: '+(w/v).toLocaleString('ru-RU',{maximumFractionDigits:1})+' кг/м³ · '+(w/v>=200?'Преобладает вес':'Преобладает объём')+' (ориентир 200 кг/м³)':'Укажите вес и объём для расчёта плотности';};
  card.addEventListener('input',updateInsight);updateInsight();list.append(card);
 });window.dispatchEvent(new Event('sense-cargos-change'));}
 add.addEventListener('click',()=>{const items=collectHomeCargo();if(items.length>=100)return;items.push({weight:0,volume:0,name:'',tnved:''});render(items);list.lastElementChild.querySelector('input').focus()});render(getCargoItems());
})();
