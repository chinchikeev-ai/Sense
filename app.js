const icons={cube:'<path d="m12 3 9 5v9l-9 5-9-5V8l9-5Z"/><path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5"/>',shield:'<path d="M12 3c3 3 6 3 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V7c3-1 6-1 9-4Z"/><path d="m8 13 3 3 5-6"/>',bolt:'<path d="m13 2-9 12h7l-1 9 10-13h-7l1-8Z"/>',ship:'<path d="m3 14 9-3 9 3-3 6H6l-3-6ZM6 13V7h12v6M9 7V3h6v4M1 22c2-2 4 2 6 0s4 2 6 0 4 2 6 0 3 0 4 0"/>',pin:'<path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',truck:'<path d="M2 5h13v14H2zM15 10h4l4 5v4h-8"/><circle cx="6" cy="20" r="2"/><circle cx="19" cy="20" r="2"/>',file:'<path d="M5 2h9l5 5v16H5zM14 2v6h5M8 12h8M8 16h8M8 20h5"/>',headset:'<path d="M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v8H3zM17 12h4v8h-4zM17 20c0 3-3 3-6 3"/>',arrow:'<path d="M3 12h18m-6-6 6 6-6 6"/>',weight:'<path d="M7 8h10l4 14H3L7 8Z"/><circle cx="12" cy="5" r="3"/>',send:'<path d="m2 11 21-9-8 21-4-9-9-3ZM11 14 23 2"/>'};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n]||icons.cube}</svg>`;
const cities=['Гуанчжоу','Иу','Шэньчжэнь','Шанхай'], destinations=['Москва','Краснодар','Санкт-Петербург','Новосибирск','Челябинск'];
const defaults={origin:'Гуанчжоу',destination:'Москва',weight:120,volume:.8,tnved:'',cargoName:'',comment:''};
const params=new URLSearchParams(location.search);const state={...defaults};for(const k of Object.keys(state)){if(params.has(k))state[k]=params.get(k)}if(!cities.includes(state.origin))state.origin=defaults.origin;if(!destinations.includes(state.destination))state.destination=defaults.destination;for(const k of ['weight','volume']){state[k]=Number(state[k]);if(!Number.isFinite(state[k])||state[k]<=0)state[k]=defaults[k]}
const page=location.pathname.endsWith('calculator.html')?'calculator':location.pathname.endsWith('order.html')?'order':'home';
document.body.classList.add(page+'-page');
const $=s=>document.querySelector(s);const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const money=n=>Math.round(n).toLocaleString('ru-RU')+' ₽';
function chargeableWeight(s=state){return Math.max(+s.weight,+s.volume*167)}
function cargoDensity(s=state){return +s.volume>0?Math.round(+s.weight/+s.volume):0}
function estimate(s=state){const factors=[1,.97,1.05,1.02],dest=[1,1.1,1.07,.93,.96];return Math.round((18200+chargeableWeight(s)*112+(+s.volume)*4400)*factors[cities.indexOf(s.origin)]*dest[destinations.indexOf(s.destination)])}
function link(file){return './'+file+'?'+new URLSearchParams(state).toString()}
const brand=`<a class="brand" href="./index.html" aria-label="Sense — главная"><span class="brand-mark">${icon('cube')}</span><span class="brand-name">Sense</span></a>`;
const options=(list,v)=>list.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');
function header(){return `<header><div class="topbar"><div class="brandline"><div class="header-brand">${brand}<span class="header-brand-subtitle">Международная логистика</span></div></div><div class="cities" aria-label="Город отправления">${cities.map(c=>`<button data-city="${c}" aria-pressed="${c===state.origin}">${c}</button>`).join('')}</div><a class="support" href="${link('order.html')}" data-route="order.html">${icon('headset')}<span>Обсудить<br>доставку</span></a></div></header>`}
function footer(){return `<footer class="footer">${brand}<p>Глобальные решения<br>для вашего бизнеса</p><p>Доставка грузов из Китая в Россию<br>© ${new Date().getFullYear()} Sense</p></footer>${page!=='order'?`<a class="button fixed-order" data-route="order.html" href="${link('order.html')}">${icon('send')} Заказать доставку</a>`:''}`}
function benefits(){return `<div class="section benefits">${[['truck','Разные типы грузов','От образцов до контейнеров'],['shield','Страхование груза','Условия под ваш маршрут'],['file','Полное сопровождение','На каждом этапе доставки'],['cube','Прозрачный расчёт','Все параметры перед вами']].map(([i,h,p])=>`<div class="benefit">${icon(i)}<div><strong>${h}</strong><p>${p}</p></div></div>`).join('')}</div>`}
const deliveryMethods=[
  {id:'auto',label:'Авто',title:'Автомобильная доставка',description:'Перевозка груза автомобильным транспортом из Китая в Россию. Маршрут, пункты забора и доставки согласуются под ваш груз.'},
  {id:'rail',label:'ЖД',title:'Железнодорожная доставка',description:'Перевозка груза по железной дороге. Станции отправления и прибытия, а также доставка от станции до получателя согласуются при расчёте.'},
  {id:'sea',label:'Море',title:'Морская доставка',description:'Перевозка груза морем между портами. Порт назначения и дальнейшая доставка по России подбираются под ваш маршрут.'}
];
function transportTabs(prefix){return `<div class="transport-tabs" role="tablist" aria-label="Способ доставки">${deliveryMethods.map((m,i)=>`<button type="button" role="tab" id="${prefix}-tab-${m.id}" aria-controls="${prefix}-panel-${m.id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${m.label}</button>`).join('')}</div>`}
function transportPanels(prefix){return `<div class="transport-details">${deliveryMethods.map((m,i)=>`<section role="tabpanel" id="${prefix}-panel-${m.id}" aria-labelledby="${prefix}-tab-${m.id}" tabindex="0" ${i===0?'':'hidden'}><h4>${m.title}</h4><p>${m.description}</p><div class="transport-rates"><div><span>За 1 кг</span><strong>По запросу</strong><small>Минимальная партия — 250 кг</small></div><div><span>За 1 м³</span><strong>По запросу</strong><small>Минимальная партия — 1 м³</small></div></div><p class="transport-note">Стоимость и срок зависят от маршрута и характеристик груза. Тариф уточнит менеджер.</p></section>`).join('')}</div>`}
function home(){return `<main class="home-main">
<section class="hero home-screen home-delivery">
  <img class="hero-art" src="./hero.jpg" alt="Контейнер Sense с грузом на фоне международного порта" fetchpriority="high">
  <div class="hero-inner">
    <div class="hero-content">
      <h1 class="reveal">Доставка грузов<br>из Китая<br><span>без сложностей</span></h1>
      <p class="hero-copy reveal delay">Надёжные перевозки. Прозрачные расчёты.<br>Полное сопровождение от склада до вашего города.</p>
      <div class="promise reveal delay"><div>${icon('shield')}Официальное<br>оформление</div><div>${icon('cube')}Страхование<br>грузов</div><div>${icon('bolt')}Личный менеджер<br>на каждом этапе</div></div>
      <div class="actions reveal delay">
        <a class="button" href="#home-calculator">Рассчитать доставку ${icon('arrow')}</a>
        <a class="button secondary" href="#home-lead">Оставить заявку</a>
      </div>
      <div class="hero-bottom">
        <div><strong>4 города</strong><small>склады в Китае</small></div>
        <div><strong>5 городов</strong><small>доставка по России</small></div>
        <div><strong>1 расчёт</strong><small>все детали маршрута</small></div>
      </div>
    </div>

    <div class="hero-visual">
    <div class="float-card origin-card">${icon('pin')}<div><strong><span data-origin>${state.origin}</span> → Россия</strong><small>Точка отправления выбрана сверху</small></div></div>
    <div class="float-card process-card">
      ${[['weight','Забор груза'],['file','Оформление'],['ship','Перевозка'],['truck','Доставка до двери']].map(([i,t])=>`<div>${icon(i)}<span>${t}</span></div>`).join('')}
    </div>
    <div class="float-card sea-card">${icon('ship')}<div><strong>Международная доставка</strong><small>Маршрут под параметры груза</small></div></div>
    </div>
  </div>
</section>

<section class="home-screen home-calculator" id="home-calculator">
  <div class="home-screen-inner">
    <div class="home-section-head">
      <div>
        <p class="eyebrow">02 / Калькулятор</p>
        <h2>Рассчитайте <span>стоимость доставки</span></h2>
        <p class="sub">Вес, объём, ТН ВЭД, наименование и город назначения — всё в одном экране.</p>
      </div>
      <div class="screen-number">02</div>
    </div>

    <div class="home-calc-grid">
      <form class="panel home-calc-form reveal" id="homeCalcForm">
        <div class="panel-head cargo-method-head"><h3>Параметры груза</h3>${transportTabs('home-transport')}</div>${transportPanels('home-transport')}
        <div class="fields">
          <div class="field">
            <label for="homeWeight">Вес</label>
            <div class="input-wrap"><input id="homeWeight" type="number" min=".01" max="10000000" step=".01" value="${state.weight}" required><span class="unit">кг</span></div>
          </div>
          <div class="field">
            <label for="homeVolume">Объём</label>
            <div class="input-wrap"><input id="homeVolume" type="number" min=".01" max="100000" step=".01" value="${state.volume}" required><span class="unit">м³</span></div>
          </div>
          <div class="field">
            <label for="homeTnved">ТН ВЭД</label>
            <input id="homeTnved" inputmode="numeric" maxlength="14" placeholder="8471 30 000 0" value="${esc(state.tnved)}">
          </div>
          <div class="field">
            <label for="homeDestination">Город доставки</label>
            <select id="homeDestination">${options(destinations,state.destination)}</select>
          </div>
          <div class="field full">
            <label for="homeCargoName">Наименование груза</label>
            <input id="homeCargoName" maxlength="200" placeholder="Например, электроника" value="${esc(state.cargoName)}">
          </div>
          <div class="field full">
            <label for="homeComment">Комментарий</label>
            <textarea id="homeComment" maxlength="2000" placeholder="Упаковка, габариты, особенности груза...">${esc(state.comment)}</textarea>
          </div>
        </div>
        <div class="home-calc-actions">
          <button class="button" type="submit">Пересчитать ${icon('arrow')}</button>
          <a class="button secondary" id="homeFullCalc" data-route="calculator.html" href="${link('calculator.html')}">Открыть полный калькулятор</a>
        </div>
      </form>

      <aside class="panel home-result reveal delay">
        <div class="panel-head"><h3>Предварительный результат</h3><span class="badge">Демо-тариф</span></div>
        <div class="price-label">Ориентировочная стоимость</div>
        <div class="price" id="homePrice">${money(estimate())}</div>
        <p class="fine">Точный тариф подтверждается после проверки груза, документов и маршрута.</p>
        <div class="home-result-metrics">
          <div><small>Маршрут</small><strong id="homeRoute">${state.origin} → ${state.destination}</strong></div>
          <div><small>Расчётный вес</small><strong id="homeChargeable">${Math.round(chargeableWeight())} кг</strong></div>
          <div><small>Плотность</small><strong id="homeDensity">${cargoDensity()} кг/м³</strong></div>
        </div>
        <div class="route home-route">
          <div class="route-city"><span class="flag">🇨🇳</span><div><span data-origin>${state.origin}</span><small>Китай</small></div></div>
          <div class="route-line">${icon('ship')}→</div>
          <div class="route-city"><span class="flag">🇷🇺</span><div><span id="homeDestinationOut">${state.destination}</span><small>Россия</small></div></div>
        </div>
        <a class="button full-button" href="#home-lead">Заказать доставку ${icon('arrow')}</a>
      </aside>
    </div>
  </div>
</section>

<section class="home-screen home-lead" id="home-lead">
  <div class="home-screen-inner promo-grid">
    <div class="promo-copy reveal">
      <p class="eyebrow">03 / Промо + заявка</p>
      <h2>Ваш груз уже <span>ближе к России</span></h2>
      <p class="sub">Оставьте контакт. Параметры расчёта сохранятся, а на следующем шаге можно будет дополнить заявку.</p>
      <div class="promo-points">
        <div class="promo-point">${icon('shield')}<div><strong>Проверим маршрут</strong><small>Сверим условия и риски по вашему товару</small></div></div>
        <div class="promo-point">${icon('file')}<div><strong>Подготовим документы</strong><small>Уточним ТН ВЭД и комплект документов</small></div></div>
        <div class="promo-point">${icon('truck')}<div><strong>Доведём до двери</strong><small>Организуем финальное плечо по России</small></div></div>
      </div>
    </div>

    <form class="panel home-lead-card reveal delay" id="homeLeadForm">
      <div class="panel-head"><h3>Оставить заявку</h3><span class="badge">1 минута</span></div>
      <div class="home-lead-summary">
        <span>Ваш маршрут</span>
        <strong id="homeLeadRoute">${state.origin} → ${state.destination}</strong>
        <span>Ориентир</span>
        <strong class="lead-price" id="homeLeadPrice">${money(estimate())}</strong>
      </div>
      <div class="fields lead-fields">
        <div class="field full"><label for="homeLeadName">Ваше имя</label><input id="homeLeadName" autocomplete="name" maxlength="100" placeholder="Как к вам обращаться" required></div>
        <div class="field full"><label for="homeLeadContact">Телефон, Telegram или WeChat</label><input id="homeLeadContact" maxlength="100" minlength="5" placeholder="+7 999 000-00-00 или @username" required></div>
        <div class="field full"><label for="homeLeadCompany">Компания <span class="fine">— необязательно</span></label><input id="homeLeadCompany" autocomplete="organization" maxlength="200" placeholder="Название компании"></div>
      </div>
      <button class="button full-button" type="submit">Продолжить оформление ${icon('arrow')}</button>
      <p class="fine">Контакт сохраняется только в браузере как черновик до перехода на страницу заявки.</p>
    </form>
  </div>
</section>
</main>`}
function result(){return `<aside class="panel reveal delay"><div class="panel-head"><h3>Результат расчёта</h3><span class="badge">Демо-тариф</span></div><div class="price-label">Ориентировочная стоимость доставки</div><div class="price" id="price" aria-live="polite">${money(estimate())}</div><div class="fine">Демонстрационный расчёт, не коммерческое предложение.<br>Точный тариф и состав услуг требуют подтверждения.</div><div class="stats"><div class="stat">${icon('weight')}<div><small>Фактический вес</small><strong id="weightOut">${state.weight} кг</strong></div></div><div class="stat">${icon('weight')}<div><small>Расчётный вес</small><strong id="chargeableWeightOut">${Math.round(chargeableWeight())} кг</strong></div></div><div class="stat">${icon('cube')}<div><small>Объём</small><strong id="volumeOut">${state.volume} м³</strong></div></div><div class="stat">${icon('cube')}<div><small>Плотность</small><strong id="densityOut">${cargoDensity()} кг/м³</strong></div></div></div><div class="divider"></div><h3>Маршрут доставки</h3><div class="route"><div class="route-city"><span class="flag">🇨🇳</span><div><span data-origin>${state.origin}</span><small>Китай</small></div></div><div class="route-line">${icon('ship')}→</div><div class="route-city"><span class="flag">🇷🇺</span><div><span id="destinationOut">${state.destination}</span><small>Россия</small></div></div></div><div class="timeline"><div>Забор<br>груза</div><div>Экспортное<br>оформление</div><div>Международная<br>перевозка</div><div>Таможня<br>РФ</div><div>Доставка<br>до двери</div></div><div class="included"><h4>Обсудим при согласовании:</h4><ul><li>Перевозку</li><li>Страхование</li><li>Оформление</li><li>Консолидацию</li><li>Сопровождение</li><li>Доставку до двери</li></ul></div><p class="fine">Сроки, пошлины и обязательные платежи рассчитываются отдельно после проверки груза и документов.</p><a class="button full-button" href="${link('order.html')}" data-route="order.html">Перейти к заявке ${icon('arrow')}</a></aside>`}
function calculator(){return `<main class="page"><section class="section"><div class="breadcrumb"><a href="./index.html">Главная</a> &nbsp; / &nbsp; Калькулятор</div><p class="eyebrow">Онлайн-расчёт</p><h2>Рассчитайте <span>стоимость</span> доставки</h2><p class="sub">Укажите параметры груза, чтобы получить предварительную оценку.<br>Выбранный город Китая можно изменить в верхней панели.</p><div class="calc-grid"><form class="panel reveal" id="cargoForm"><div class="panel-head cargo-method-head"><h3>Параметры груза</h3>${transportTabs('calc-transport')}</div>${transportPanels('calc-transport')}<div class="cargo-reset"><button type="reset" class="text-button">↻ &nbsp; Сбросить</button></div><div class="fields"><div class="field"><label for="weight">Вес</label><div class="input-wrap"><input id="weight" name="weight" type="number" min=".01" max="10000000" step=".01" value="${state.weight}" required><span class="unit">кг</span></div></div><div class="field"><label for="volume">Объём</label><div class="input-wrap"><input id="volume" name="volume" type="number" min=".01" max="100000" step=".01" value="${state.volume}" required><span class="unit">м³</span></div></div><div class="field full"><label for="tnved">ТН ВЭД груза</label><input id="tnved" name="tnved" inputmode="numeric" pattern="[0-9 ]{10,14}" maxlength="14" placeholder="Например, 8471 30 000 0" value="${esc(state.tnved)}"><small class="help">10 цифр, если код известен. Подбор кода — после проверки товара.</small></div><div class="field full"><label for="cargoName">Наименование</label><input id="cargoName" name="cargoName" maxlength="200" placeholder="Например, электроника" value="${esc(state.cargoName)}"></div><div class="field full"><label for="destination">Город доставки</label><select name="destination" id="destination">${options(destinations,state.destination)}</select></div><div class="field full"><label for="comment">Комментарий</label><textarea id="comment" name="comment" maxlength="2000" placeholder="Габариты, упаковка и дополнительная информация о грузе…">${esc(state.comment)}</textarea></div></div><button class="button full-button" type="submit">Рассчитать стоимость ${icon('arrow')}</button><p class="fine">Расчёт не включает пошлины и налоги. Код ТН ВЭД и комментарий передаются в заявку, но не изменяют демо-тариф.</p></form>${result()}</div><div class="page-nav"><a href="./index.html">← Главная</a><span>02 / 03</span></div></section>${benefits()}</main>`}
function order(){return `<main class="page"><section class="section"><div class="breadcrumb"><a href="./index.html">Главная</a> &nbsp; / &nbsp; <a data-route="calculator.html" href="${link('calculator.html')}">Калькулятор</a> &nbsp; / &nbsp; Заявка</div><p class="eyebrow">Следующий шаг</p><h2>Ваш груз уже <span>ближе.</span></h2><p class="sub">Проверьте параметры и подготовьте заявку на доставку.</p><div class="calc-grid"><form class="panel reveal" id="orderForm"><div class="panel-head"><h3>Контактные данные</h3><span class="badge">03 / 03</span></div><div class="fields"><div class="field full"><label for="clientName">Ваше имя</label><input id="clientName" autocomplete="name" placeholder="Как к вам обращаться" maxlength="100" required></div><div class="field full"><label for="contact">Телефон, Telegram или WeChat</label><input id="contact" placeholder="+7 999 000-00-00 или @username" minlength="5" maxlength="100" required></div><div class="field full"><label for="company">Компания <span class="fine">— необязательно</span></label><input id="company" autocomplete="organization" maxlength="200" placeholder="Название компании"></div></div><div class="notice">Отправка менеджеру пока не подключена. Здесь можно подготовить и скачать заявку. Ваши контактные данные никуда не отправляются.</div><button class="button full-button" type="submit">Подготовить заявку ${icon('arrow')}</button><div id="orderStatus" role="status"></div></form><aside class="panel reveal delay"><div class="panel-head"><h3>Ваша доставка</h3><a class="text-button" href="${link('calculator.html')}" data-route="calculator.html">Изменить</a></div><div class="route"><div class="route-city"><span class="flag">🇨🇳</span><div><span data-origin>${state.origin}</span><small>Китай</small></div></div><span style="color:var(--blue)">→</span><div class="route-city"><span class="flag">🇷🇺</span><div>${state.destination}<small>Россия</small></div></div></div><div class="divider"></div><div class="order-summary">${[['Наименование',state.cargoName||'Не указано'],['Вес',state.weight+' кг'],['Объём',state.volume+' м³'],['ТН ВЭД',state.tnved||'Требует уточнения']].map(([k,v])=>`<div class="summary-row"><span>${k}</span><strong>${esc(v)}</strong></div>`).join('')}</div>${state.comment?`<p class="fine">Комментарий: ${esc(state.comment)}</p>`:''}<div class="divider"></div><div class="price-label">Предварительная оценка</div><div class="price" id="price">${money(estimate())}</div><p class="fine">Демо-тариф. Стоимость перевозки, сроки, таможенные платежи и страхование требуют согласования.</p><div class="included"><h4>Что нужно для точного расчёта?</h4><p class="fine">Описание товара, инвойс, упаковочный лист, адрес отправления и условия поставки.</p></div></aside></div><div class="page-nav"><a href="${link('calculator.html')}" data-route="calculator.html">← Вернуться к расчёту</a><span>03 / 03</span></div></section></main>`}
document.title=page==='calculator'?'Калькулятор доставки — Sense':page==='order'?'Заявка на доставку — Sense':'Sense — доставка грузов из Китая';$('#app').innerHTML=header()+(page==='home'?home():page==='calculator'?calculator():order())+footer();
function syncLinks(){document.querySelectorAll('[data-route]').forEach(a=>a.href=link(a.dataset.route))}
function refresh(){document.querySelectorAll('[data-origin]').forEach(e=>e.textContent=state.origin);if($('#price'))$('#price').textContent=money(estimate());if($('#weightOut')){$('#weightOut').textContent=state.weight+' кг';if($('#chargeableWeightOut'))$('#chargeableWeightOut').textContent=Math.round(chargeableWeight())+' кг';$('#volumeOut').textContent=state.volume+' м³';$('#densityOut').textContent=cargoDensity()+' кг/м³';$('#destinationOut').textContent=state.destination}syncLinks()}
document.querySelectorAll('[data-city]').forEach(b=>b.addEventListener('click',()=>{state.origin=b.dataset.city;document.querySelectorAll('[data-city]').forEach(e=>e.setAttribute('aria-pressed',String(e===b)));refresh();window.dispatchEvent(new Event('sense-origin-change'));if($('#orderStatus'))$('#orderStatus').replaceChildren()}));
function readForm(){const code=$('#tnved').value.replace(/\s/g,'');$('#tnved').setCustomValidity(code&&!/^\d{10}$/.test(code)?'Укажите 10 цифр кода ТН ВЭД или оставьте поле пустым.':'');if(!$('#cargoForm').checkValidity())return false;for(const k of ['weight','volume','tnved','cargoName','destination','comment'])state[k]=['weight','volume'].includes(k)?Number($('#'+k).value):$('#'+k).value;refresh();return true}
if($('#cargoForm')){$('#cargoForm').addEventListener('input',readForm);$('#cargoForm').addEventListener('change',readForm);$('#cargoForm').addEventListener('submit',e=>{e.preventDefault();if(readForm()){$('#price').animate([{opacity:.3},{opacity:1}],{duration:350})}});$('#cargoForm').addEventListener('reset',e=>{e.preventDefault();const origin=state.origin;Object.assign(state,defaults,{origin});for(const k of ['weight','volume','tnved','cargoName','destination','comment'])$('#'+k).value=state[k];refresh()})}
if($('#homeCalcForm')){const syncHomeCalc=()=>{state.weight=Math.max(.01,Number($('#homeWeight').value)||defaults.weight);state.volume=Math.max(.01,Number($('#homeVolume').value)||defaults.volume);state.tnved=$('#homeTnved').value;state.cargoName=$('#homeCargoName').value;state.destination=$('#homeDestination').value;state.comment=$('#homeComment').value;$('#homePrice').textContent=money(estimate());$('#homeRoute').textContent=state.origin+' → '+state.destination;$('#homeChargeable').textContent=Math.round(chargeableWeight())+' кг';$('#homeDensity').textContent=cargoDensity()+' кг/м³';$('#homeDestinationOut').textContent=state.destination;$('#homeLeadRoute').textContent=state.origin+' → '+state.destination;$('#homeLeadPrice').textContent=money(estimate());$('#homeFullCalc').href=link('calculator.html');syncLinks()};$('#homeCalcForm').addEventListener('input',syncHomeCalc);$('#homeCalcForm').addEventListener('change',syncHomeCalc);$('#homeCalcForm').addEventListener('submit',e=>{e.preventDefault();syncHomeCalc();$('#homePrice').animate([{opacity:.35,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:300})});window.addEventListener('sense-origin-change',syncHomeCalc)}
if($('#homeLeadForm')){$('#homeLeadForm').addEventListener('submit',e=>{e.preventDefault();const draft={name:$('#homeLeadName').value,contact:$('#homeLeadContact').value,company:$('#homeLeadCompany').value};try{localStorage.setItem('senseLeadDraft',JSON.stringify(draft))}catch{}location.href=link('order.html')})}
if(page==='calculator'){document.body.insertAdjacentHTML('beforeend','<div class="quick-modal" id="quickOrderModal" aria-hidden="true"><div class="quick-modal-card" role="dialog" aria-modal="true" aria-labelledby="quickOrderTitle"><div class="quick-modal-head"><div><p class="eyebrow">Быстрая заявка</p><h3 id="quickOrderTitle">Заказать доставку</h3><p>Проверьте расчёт и оставьте контакт. Для расширенной заявки можно перейти на следующий шаг.</p></div><button type="button" class="quick-modal-close" id="quickOrderClose" aria-label="Закрыть">×</button></div><div class="quick-order-preview" id="quickOrderPreview"></div><div class="field"><label for="quickContact">Телефон, Telegram или WeChat</label><input id="quickContact" minlength="5" maxlength="100" placeholder="+7 999 000-00-00 или @username" required></div><div class="quick-modal-actions"><button class="button" type="button" id="quickOrderPrepare">Подготовить заявку</button><a class="button secondary" id="quickOrderFull" data-route="order.html" href="#">Полная заявка</a></div><div id="quickOrderStatus" role="status"></div></div></div>');const quickModal=$('#quickOrderModal'),quickOpen=$('.fixed-order'),quickClose=$('#quickOrderClose'),quickFull=$('#quickOrderFull'),quickContact=$('#quickContact'),quickStatus=$('#quickOrderStatus');quickFull.href=link('order.html');function fillQuickPreview(){const cargo=state.cargoName||'Груз не указан';$('#quickOrderPreview').innerHTML='<div><span>Маршрут</span><strong>'+esc(state.origin)+' → '+esc(state.destination)+'</strong></div><div><span>Груз</span><strong>'+esc(cargo)+'</strong></div><div><span>Вес / объём</span><strong>'+esc(state.weight)+' кг · '+esc(state.volume)+' м³</strong></div><div><span>Расчётный вес</span><strong>'+Math.round(chargeableWeight())+' кг</strong></div><div><span>Ориентир</span><strong class="quick-price">'+money(estimate())+'</strong></div>'}function openQuickOrder(e){if(e)e.preventDefault();if(!readForm()){$('#cargoForm').reportValidity();return}fillQuickPreview();quickFull.href=link('order.html');quickStatus.replaceChildren();quickModal.classList.add('open');quickModal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');setTimeout(()=>quickContact.focus(),40)}function closeQuickOrder(){quickModal.classList.remove('open');quickModal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open')}quickOpen.addEventListener('click',openQuickOrder);quickClose.addEventListener('click',closeQuickOrder);quickModal.addEventListener('click',e=>{if(e.target===quickModal)closeQuickOrder()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&quickModal.classList.contains('open'))closeQuickOrder()});$('#quickOrderPrepare').addEventListener('click',()=>{if(!quickContact.reportValidity())return;quickStatus.innerHTML='<div class="quick-success"><strong>Заявка подготовлена.</strong><br>Параметры груза сохранены. Для отправки менеджеру подключите CRM/API или откройте полную заявку.</div>'})}
if($('#orderForm')){$('#orderForm').addEventListener('input',()=>$('#orderStatus').replaceChildren());$('#orderForm').addEventListener('submit',e=>{e.preventDefault();const text=['Заявка на доставку Sense','Маршрут: '+state.origin+' → '+state.destination,'Груз: '+(state.cargoName||'Не указан'),'Вес: '+state.weight+' кг','Объём: '+state.volume+' м³','ТН ВЭД: '+(state.tnved||'Не указан'),'Комментарий: '+state.comment,'Оценка по демо-тарифу: '+money(estimate()),'Имя: '+$('#clientName').value,'Контакт: '+$('#contact').value,'Компания: '+$('#company').value,'Заявка подготовлена локально. Не отправлена менеджеру.'].join('\n');const blob=new Blob(['\ufeff'+text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);$('#orderStatus').innerHTML='<div class="success">Заявка подготовлена, но ещё не отправлена.<br><a class="button secondary full-button" id="downloadOrder" download="Sense-заявка.txt">Скачать заявку</a></div>';$('#downloadOrder').href=url;$('#downloadOrder').addEventListener('click',()=>setTimeout(()=>URL.revokeObjectURL(url),10000),{once:true});});}
if(document.modelContext?.registerTool){const lifecycle=new AbortController();try{Promise.resolve(document.modelContext.registerTool({name:'configure_delivery_estimate',description:'Set cargo parameters on the calculator and return a demonstration estimate, not a commercial rate. Does not submit an order.',inputSchema:{type:'object',properties:{origin:{type:'string',enum:cities},destination:{type:'string',enum:destinations},weight:{type:'number',exclusiveMinimum:0,maximum:10000000},volume:{type:'number',exclusiveMinimum:0,maximum:100000}},required:['origin','destination','weight','volume'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(page!=='calculator')throw Error('Open calculator.html first');if(!input||!cities.includes(input.origin)||!destinations.includes(input.destination)||!Number.isFinite(input.weight)||input.weight<=0||input.weight>10000000||!Number.isFinite(input.volume)||input.volume<=0||input.volume>100000)throw Error('Invalid delivery parameters');Object.assign(state,input);for(const k of ['weight','volume','destination'])$('#'+k).value=state[k];document.querySelectorAll('[data-city]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.city===state.origin)));refresh();return {estimateRub:estimate(),demonstration:true,origin:state.origin,destination:state.destination}}},{signal:lifecycle.signal})).catch(()=>{});window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true})}catch{}}

// Each delivery selector controls only its own information panels.
document.querySelectorAll('.transport-tabs').forEach(list=>{
 const tabs=[...list.querySelectorAll('[role="tab"]')];
 function select(tab){tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!active})}
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>select(tab));
  tab.addEventListener('keydown',event=>{
   let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
   event.preventDefault();select(tabs[next]);tabs[next].focus();
  });
 });
});
