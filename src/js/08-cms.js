// Published catalogue only. Unconfigured or unavailable database keeps original cards.
let publishedCmsTours = null;
const originalCmsCards = document.querySelector('#tours .cards').innerHTML;
function renderCmsCatalogue() {
  if (!publishedCmsTours) return;
  const box = document.querySelector('#tours .cards'); box.replaceChildren();
  const lang = document.documentElement.lang;
  const d = dictionary[lang] || dictionary.en;
  for (const tour of publishedCmsTours) {
    const tr = tour.translations || {};
    const t = tr[lang]?.title ? tr[lang] : tr.ru?.title ? tr.ru : tr.en || {};
    const card = document.createElement('article'); card.className='card';
    if (tour.image_url && (/^https:\/\//i.test(tour.image_url) || /^[\w./-]+\.(jpg|jpeg|png|webp)$/i.test(tour.image_url))) {
      const img=document.createElement('img'); img.src=tour.image_url; img.alt=t.title||''; img.loading='lazy'; img.width=690; img.height=320; card.append(img);
    }
    const body=document.createElement('div'); body.className='body';
    const h=document.createElement('h3'); h.textContent=t.title||''; body.append(h);
    for(const value of [t.description,t.dates,tour.price===null?null:new Intl.NumberFormat(lang==='hy'?'hy-AM':lang,{style:'currency',currency:tour.currency}).format(tour.price)]) {
      if(value){const p=document.createElement('p');p.textContent=value;body.append(p);}
    }
    if(t.program){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=lang==='ru'?'Программа тура':lang==='hy'?'Տուրի ծրագիր':'Itinerary';const p=document.createElement('p');p.style.whiteSpace='pre-wrap';p.textContent=t.program;details.append(summary,p);body.append(details);}
    const a=document.createElement('a'); a.href='#contact'; a.textContent=d.ask;
    a.addEventListener('click',()=>{document.getElementById('interest').value='custom';document.getElementById('message').value=t.title||'';});body.append(a);card.append(body);box.append(card);
  }
  if (!publishedCmsTours.length) { const p=document.createElement('p'); p.textContent=lang==='ru'?'Туры уточняйте у менеджера.':lang==='hy'?'Տուրերի համար կապվեք մենեջերի հետ։':'Contact our team for available tours.';box.append(p); }
  document.querySelector('#tours [data-i="sample"]').hidden=true;
}
new MutationObserver(renderCmsCatalogue).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
(async()=>{
  const cfg=window.SUPABASE_CONFIG||{}; if(!cfg.url||!cfg.anonKey||cfg.demo)return;
  try {
    const r=await fetch(cfg.url+'/rest/v1/site_tours?status=eq.published&select=translations,image_url,price,currency,sort_order&order=sort_order.asc,created_at.asc',{headers:{apikey:cfg.anonKey,Authorization:'Bearer '+cfg.anonKey}});
    if(!r.ok)return;const data=await r.json();if(!Array.isArray(data))return;
    publishedCmsTours=data;renderCmsCatalogue();
  }catch(e){document.querySelector('#tours .cards').innerHTML=originalCmsCards;}
})();
