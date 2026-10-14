(()=>{
  const form=document.querySelector('#homeCalcForm');
  const panel=form?.querySelector('.cargo-product-block');
  const original=panel?.querySelector('.fields');
  if(!form||!panel||!original)return;

  const list=document.createElement('div');
  list.className='cargo-list';
  list.id='cargoList';

  const controls=document.createElement('div');
  controls.className='cargo-list-controls';
  const add=document.createElement('button');
  add.type='button';
  add.className='button secondary cargo-add';
  add.textContent='+ Добавить груз';
  const totals=document.createElement('p');
  totals.className='cargo-totals';
  totals.id='cargoTotals';
  totals.setAttribute('aria-live','polite');
  controls.append(add,totals);
  original.replaceWith(list,controls);

  const fmt=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:1});
  const notify=()=>window.dispatchEvent(new Event('sense-cargos-change'));

  function field(key,label,id,index,item){
    const wrapper=document.createElement('div');
    wrapper.className='field cargo-field cargo-field-'+key;
    const title=document.createElement('label');
    const input=document.createElement('input');
    input.dataset.cargoField=key;
    input.id=index===0?id:'cargo-'+index+'-'+key;
    title.htmlFor=input.id;
    title.textContent=label;
    if(key==='weight'||key==='volume'){
      input.type='number';
      input.min='.01';
      input.max=key==='weight'?'10000000':'100000';
      input.step='any';
      input.required=true;
      input.inputMode='decimal';
      input.value=Number(item[key])>0?String(item[key]):'';
      input.placeholder=key==='weight'?'Вес в кг':'Объём в м³';
    }else{
      input.value=item[key]||'';
      input.maxLength=key==='tnved'?14:200;
      input.placeholder=key==='tnved'?'Если известен':'Например, электроника';
      if(key==='tnved'){
        input.inputMode='numeric';
        input.pattern='[0-9 ]{10,14}';
        input.title='Введите 10 цифр кода ТН ВЭД или оставьте поле пустым';
      }
    }
    wrapper.append(title,input);
    return wrapper;
  }

  function render(items,activeIndex){
    list.replaceChildren();
    items.forEach((item,index)=>{
      const card=document.createElement('section');
      card.className='cargo-item';
      card.dataset.cargoItem='';

      const head=document.createElement('div');
      head.className='cargo-item-head';
      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='cargo-item-toggle';
      toggle.setAttribute('aria-controls','cargo-content-'+index);

      const heading=document.createElement('span');
      heading.className='cargo-item-title';
      const meta=document.createElement('span');
      meta.className='cargo-item-meta';
      const chevron=document.createElement('span');
      chevron.className='cargo-item-chevron';
      chevron.textContent='⌄';
      chevron.setAttribute('aria-hidden','true');
      const headingGroup=document.createElement('span');
      headingGroup.className='cargo-item-heading-group';
      headingGroup.append(heading,meta);
      toggle.append(headingGroup,chevron);
      head.append(toggle);

      if(items.length>1){
        const remove=document.createElement('button');
        remove.type='button';
        remove.className='text-button cargo-remove';
        remove.textContent='Удалить';
        remove.setAttribute('aria-label','Удалить груз №'+(index+1));
        remove.addEventListener('click',()=>{
          const current=collectHomeCargo();
          current.splice(index,1);
          render(current,Math.min(index,current.length-1));
        });
        head.append(remove);
      }
      card.append(head);

      const body=document.createElement('div');
      body.className='cargo-item-content';
      body.id='cargo-content-'+index;

      const fields=document.createElement('div');
      fields.className='cargo-item-fields';
      // Row 1: product name + customs code; row 2: mass + volume.
      fields.append(
        field('name','Наименование товара','homeCargoName',index,item),
        field('tnved','Код ТН ВЭД','homeTnved',index,item),
        field('weight','Вес, кг','homeWeight',index,item),
        field('volume','Объём, м³','homeVolume',index,item)
      );
      body.append(fields);

      const insight=document.createElement('div');
      insight.className='cargo-insight';
      insight.setAttribute('aria-live','polite');
      insight.innerHTML='<div><small>Плотность груза</small><strong data-cargo-density>—</strong></div><div><small>Расчётная база</small><strong data-cargo-basis>—</strong></div>';
      body.append(insight);

      const extra=document.createElement('details');
      extra.className='cargo-extra';
      extra.innerHTML='<summary>Дополнительные параметры</summary><div class="cargo-extra-fields"><label>Тип упаковки<select data-cargo-packaging><option value="">Не указано</option><option>Коробки</option><option>Палеты</option><option>Ящики</option><option>Без упаковки</option><option>Другое</option></select></label><label>Особые условия перевозки<input data-cargo-notes maxlength="300" placeholder="Хрупкий груз, температурный режим и т. д."></label></div>';
      extra.querySelector('[data-cargo-packaging]').value=item.packaging||'';
      extra.querySelector('[data-cargo-notes]').value=item.notes||'';
      body.append(extra);

      const actions=document.createElement('div');
      actions.className='cargo-item-actions';
      const done=document.createElement('button');
      done.className='button cargo-done';
      done.type='button';
      done.textContent='Готово';
      actions.append(done);
      body.append(actions);
      card.append(body);

      const inputs={
        name:card.querySelector('[data-cargo-field=name]'),
        weight:card.querySelector('[data-cargo-field=weight]'),
        volume:card.querySelector('[data-cargo-field=volume]')
      };
      function refreshCard(){
        const w=Number(inputs.weight.value)||0;
        const v=Number(inputs.volume.value)||0;
        heading.textContent='Груз №'+(index+1)+(inputs.name.value.trim()?' · '+inputs.name.value.trim():'');
        meta.textContent=w>0&&v>0?fmt(w)+' кг · '+fmt(v)+' м³':'Заполните вес и объём';
        card.querySelector('[data-cargo-density]').textContent=w>0&&v>0?fmt(w/v)+' кг/м³':'—';
        const t=typeof tariff==='function'?tariff():null;
        let basis='Уточняется';
        if(w>0&&v>0){
          if(typeof t?.perKg==='number'&&typeof t?.perM3==='number'){
            basis=w*t.perKg>=v*t.perM3?'По весу':'По объёму';
          }else if(typeof t?.perKg==='number'){
            basis='По весу';
          }else if(typeof t?.perM3==='number'){
            basis='По объёму';
          }
        }
        card.querySelector('[data-cargo-basis]').textContent=basis;
      }
      card.refreshCargo=refreshCard;
      card.addEventListener('input',refreshCard);
      card.addEventListener('change',refreshCard);

      function setExpanded(open){
        body.hidden=!open;
        toggle.setAttribute('aria-expanded',String(open));
        card.classList.toggle('is-collapsed',!open);
      }
      toggle.addEventListener('click',()=>{
        const expanding=body.hidden;
        if(expanding){
          list.querySelectorAll('.cargo-item').forEach(other=>{
            const otherBody=other.querySelector('.cargo-item-content');
            otherBody.hidden=true;
            other.classList.add('is-collapsed');
            other.querySelector('.cargo-item-toggle').setAttribute('aria-expanded','false');
          });
        }
        setExpanded(expanding);
      });
      done.addEventListener('click',()=>{
        setExpanded(false);
        toggle.focus();
      });
      setExpanded(index===activeIndex);
      refreshCard();
      list.append(card);
    });
    notify();
  }

  add.addEventListener('click',()=>{
    const items=collectHomeCargo();
    if(items.length>=100)return;
    items.push({weight:0,volume:0,name:'',tnved:'',packaging:'',notes:''});
    render(items,items.length-1);
    list.lastElementChild.querySelector('[data-cargo-field=name]').focus();
  });

  const refreshCards=()=>list.querySelectorAll('.cargo-item').forEach(card=>card.refreshCargo?.());
  window.addEventListener('sense-method-change',refreshCards);
  window.addEventListener('sense-origin-change',refreshCards);
  render(getCargoItems(),0);
})();