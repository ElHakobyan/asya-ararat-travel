window.asyaRenderTours=function(lang){
 const box=document.getElementById('wpTours');if(!box)return;box.replaceChildren();
 const labels=window.ASYA_WP.dictionary[lang]||window.ASYA_WP.dictionary.en;
 for(const tour of window.ASYA_WP.tours){
  const t=tour.translations[lang]?.title?tour.translations[lang]:tour.translations.ru;
  const c=document.createElement('article');c.className='card';
  if(tour.image){const img=document.createElement('img');img.src=tour.image;img.alt=t.title;img.loading='lazy';c.append(img);}
  const body=document.createElement('div');body.className='body';const h=document.createElement('h3');h.textContent=t.title;body.append(h);
  for(const value of [t.description,t.dates,tour.price!==''?tour.price+' '+tour.currency:null]){if(value){const p=document.createElement('p');p.textContent=value;body.append(p);}}
  if(t.program){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=lang==='ru'?'Программа':lang==='hy'?'Ծրագիր':'Itinerary';const p=document.createElement('p');p.className='wp-tour-program';p.textContent=t.program;details.append(summary,p);body.append(details);}
  const a=document.createElement('a');a.href='#contact';a.textContent=labels.ask;a.addEventListener('click',()=>{document.getElementById('interest').value='Custom';document.getElementById('message').value=t.title;});body.append(a);c.append(body);box.append(c);
 }
 if(!window.ASYA_WP.tours.length){const p=document.createElement('p');p.textContent=lang==='ru'?'Уточните доступные туры у менеджера.':lang==='hy'?'Տուրերի համար կապվեք մենեջերի հետ։':'Contact our team for available tours.';box.append(p);}
};
window.asyaRenderTours(document.documentElement.lang);
