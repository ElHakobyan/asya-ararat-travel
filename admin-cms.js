/* Shares the existing Supabase sign-in and admin authorization. */
const cmsLanguages = {ru: 'Русский', en: 'English', hy: 'Հայերեն'};
let cmsTours = [], cmsLoaded = false;
for (const [lang, label] of Object.entries(cmsLanguages)) {
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend'); legend.textContent = label; fieldset.append(legend);
  for (const [key, title] of Object.entries({title:'Название', description:'Описание', dates:'Даты', program:'Программа по дням'})) {
    const id = 'cms-' + lang + '-' + key;
    const l = document.createElement('label'); l.htmlFor = id; l.textContent = title;
    const input = document.createElement(key === 'description' || key === 'program' ? 'textarea' : 'input');
    input.id = id; input.maxLength = key === 'program' ? 12000 : 2000;
    if (key === 'title' && lang === 'ru') input.required = true;
    fieldset.append(l, input);
  }
  $('tourTranslations').append(fieldset);
}
async function loadTours() {
  if (cmsLoaded) return;
  try {
    const r = await api('/rest/v1/site_tours?select=*&order=sort_order.asc,created_at.asc');
    if (!r.ok) throw new Error('Не удалось загрузить туры. Выполните supabase-cms.sql после supabase-setup.sql. Код: ' + r.status);
    cmsTours = await r.json(); cmsLoaded = true; renderCmsTours();
  } catch(e) { say('tourMsg', e.message, 'err'); }
}
function renderCmsTours() {
  $('tourList').replaceChildren();
  for (const tour of cmsTours) {
    const card = document.createElement('article'); card.className = 'card review'; card.style.marginTop = '14px';
    const h = document.createElement('h3'); h.textContent = tour.translations?.ru?.title || tour.translations?.en?.title || 'Без названия';
    const p = document.createElement('p'); p.textContent = ({draft:'Черновик',published:'Опубликован',hidden:'Скрыт'})[tour.status];
    card.append(h,p,btn('Редактировать','ghost',()=>editCmsTour(tour))); $('tourList').append(card);
  }
  if (!cmsTours.length) $('tourList').textContent = 'В базе пока нет туров. Добавьте и опубликуйте первый тур.';
}
function editCmsTour(tour = {}) {
  $('tourForm').reset(); $('tourId').value = tour.id || '';
  $('tourStatus').value = tour.status || 'draft'; $('tourPrice').value = tour.price ?? '';
  $('tourCurrency').value = tour.currency || 'USD'; $('tourImage').value = tour.image_url || ''; $('tourOrder').value = tour.sort_order || 0;
  for (const lang of Object.keys(cmsLanguages)) for (const key of ['title','description','dates','program']) $('cms-'+lang+'-'+key).value = tour.translations?.[lang]?.[key] || '';
  $('tourForm').hidden = false; $('tourForm').scrollIntoView({behavior:'smooth'}); $('cms-ru-title').focus();
}
$('newTour').addEventListener('click',()=>editCmsTour());
$('cancelTour').addEventListener('click',()=>{ $('tourForm').hidden=true; });
$('tourForm').addEventListener('submit',async e=>{
  e.preventDefault(); const button=$('saveTour'); button.disabled=true; say('tourMsg','Сохраняем…');
  try {
    let image=$('tourImage').value.trim();
    if (image && !/^https:\/\//i.test(image) && !/^[\w./-]+\.(jpg|jpeg|png|webp)$/i.test(image)) throw new Error('Укажите HTTPS-ссылку или имя файла изображения.');
    const file=$('tourUpload').files[0];
    if(file){
      const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
      if(!ext || file.size>5*1024*1024) throw new Error('Выберите JPEG, PNG или WebP размером до 5 МБ.');
      const path=crypto.randomUUID()+'.'+ext;
      const r=await api('/storage/v1/object/tour-images/'+path,{method:'POST',headers:{'Content-Type':file.type},body:file});
      if(!r.ok) throw new Error('Не удалось загрузить фото (код '+r.status+').');
      image=CFG.url+'/storage/v1/object/public/tour-images/'+path;
      $('tourImage').value=image; $('tourUpload').value='';
    }
    const translations={};
    for(const lang of Object.keys(cmsLanguages)) { translations[lang]={}; for(const key of ['title','description','dates','program']) translations[lang][key]=$('cms-'+lang+'-'+key).value.trim(); }
    if(!translations.ru.title) throw new Error('Заполните название на русском.');
    const data={translations,image_url:image,status:$('tourStatus').value,price:$('tourPrice').value===''?null:Number($('tourPrice').value),currency:$('tourCurrency').value,sort_order:Number($('tourOrder').value)};
    const id=$('tourId').value;
    const r=await api('/rest/v1/site_tours'+(id?'?id=eq.'+encodeURIComponent(id):''),{method:id?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(data)});
    if(!r.ok) throw new Error('Не удалось сохранить тур (код '+r.status+').');
    const saved=await r.json(); if(!saved.length) throw new Error('Изменение не сохранено. Проверьте права администратора.');
    cmsLoaded=false; await loadTours(); $('tourForm').hidden=true;
    say('tourMsg',data.status==='published'?'Тур опубликован. Обновите страницу сайта.':'Тур сохранён. На сайте видны только опубликованные туры.','ok');
  }catch(e){say('tourMsg',e.message,'err');}finally{button.disabled=false;}
});
