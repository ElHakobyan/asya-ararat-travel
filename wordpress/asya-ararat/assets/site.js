const dictionary=window.ASYA_WP.dictionary;
function setLanguage(language){let dict=dictionary[language]||dictionary.en;document.documentElement.lang=language;document.querySelectorAll('[data-i]').forEach(el=>{const k=el.dataset.i;if(dict[k])el.textContent=dict[k]});document.getElementById('lang').value=language;syncLang(language);if(window.asyaRenderTours)window.asyaRenderTours(language);try{localStorage.setItem('asya-language',language)}catch(e){}}
document.getElementById('lang').addEventListener('change',e=>setLanguage(e.target.value));let initial='en';try{initial=localStorage.getItem('asya-language')||'en'}catch(e){}setLanguage(initial);

const rvDialog=document.getElementById('reviewDialog'),rvForm=document.getElementById('reviewForm'),reviewEmpty=document.getElementById('reviewEmpty'),sumBox=document.getElementById('ratingSummary'),CFG=window.SUPABASE_CONFIG||{},DB_ON=!!(CFG.url&&CFG.anonKey);let lastSummary=null;
function dbHeaders(){const h={apikey:CFG.anonKey};if(String(CFG.anonKey).indexOf('eyJ')===0)h.Authorization='Bearer '+CFG.anonKey;return h}
document.getElementById('reviewBtn').addEventListener('click',()=>{if(rvDialog.showModal){rvDialog.showModal()}else{rvDialog.setAttribute('open','')}});
document.getElementById('rvClose').addEventListener('click',()=>{rvDialog.close?rvDialog.close():rvDialog.removeAttribute('open')});
rvDialog.addEventListener('click',e=>{if(e.target===rvDialog&&rvDialog.close)rvDialog.close()});
rvForm.addEventListener('submit',e=>{e.preventDefault();const d=dictionary[document.getElementById('lang').value]||dictionary.en,rate=(rvForm.querySelector('input[name=rvRate]:checked')||{}).value,ch=(e.submitter&&e.submitter.dataset.channel)||(DB_ON?'db':'whatsapp');if(!rate)return;if(ch==='db'){submitRating(d,rate);return}deliver(ch,[d.wa_review,d.rv_l_rating+': '+rate+'/5'].join('\n'),document.getElementById('rvStatus'),d)});
async function submitRating(d,rate){const st=document.getElementById('rvStatus'),btn=document.getElementById('rvSendDb');if(document.getElementById('rvWebsite').value){st.textContent=d.rvThanks;return}btn.disabled=true;try{const res=await fetch(CFG.url+'/rest/v1/reviews',{method:'POST',headers:Object.assign({'Content-Type':'application/json',Prefer:'return=minimal'},dbHeaders()),body:JSON.stringify({rating:Number(rate),status:'pending'})});if(!res.ok)throw new Error(res.status);st.textContent=d.rvThanks;rvForm.reset();setTimeout(()=>{if(rvDialog.open&&rvDialog.close)rvDialog.close()},3500)}catch(err){st.textContent=d.rvError}finally{btn.disabled=false}}
function renderSummary(sm){lastSummary=sm;sumBox.textContent='';if(!sm||!Number(sm.total)){sumBox.hidden=true;reviewEmpty.hidden=false;return}reviewEmpty.hidden=true;sumBox.hidden=false;const d=dictionary[document.getElementById('lang').value]||dictionary.en,total=Number(sm.total),avg=Number(sm.average)||0,full=Math.round(avg),score=document.createElement('div');score.className='rs-score';const big=document.createElement('b');big.textContent=avg.toFixed(1);const st=document.createElement('div');st.className='stars';st.setAttribute('role','img');st.setAttribute('aria-label',avg.toFixed(1)+' / 5');st.textContent='★'.repeat(full)+'☆'.repeat(5-full);const cnt=document.createElement('span');cnt.textContent=(d.ratingsCount||'Ratings: {n}').replace('{n}',total);score.append(big,st,cnt);const bars=document.createElement('div');bars.className='rs-bars';for(let i=5;i>=1;i--){const c=Number((sm.counts||{})[i])||0,row=document.createElement('div');row.className='rs-row';const l=document.createElement('span');l.textContent=i+' ★';const tr=document.createElement('span');tr.className='rs-track';const f=document.createElement('span');f.className='rs-fill';f.style.width=Math.round(c/total*100)+'%';tr.append(f);const n=document.createElement('span');n.className='rs-n';n.textContent=c;row.append(l,tr,n);bars.append(row)}sumBox.append(score,bars)}
document.getElementById('lang').addEventListener('change',()=>{if(lastSummary)renderSummary(lastSummary)});
document.getElementById('rvChannels').hidden=DB_ON;document.getElementById('rvSendDb').hidden=!DB_ON;
if(DB_ON){fetch(CFG.url+'/rest/v1/rpc/rating_summary',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},dbHeaders()),body:'{}'}).then(r=>r.ok?r.json():null).then(renderSummary).catch(()=>{})}

const langBtn=document.getElementById('langBtn'),langList=document.getElementById('langList'),langMenu=document.getElementById('langmenu'),langSelect=document.getElementById('lang');
function syncLang(code){const short={en:'EN',hy:'ՀԱՅ',ru:'RU'},c=short[code]?code:'en';document.getElementById('langLabel').textContent=short[c];document.querySelectorAll('#langList [role=option]').forEach(o=>o.setAttribute('aria-selected',String(o.dataset.lang===c)))}
function langOptions(){return [...langList.querySelectorAll('[role=option]')]}
function openLang(focusSel){langList.hidden=false;langBtn.setAttribute('aria-expanded','true');langMenu.classList.add('open');if(focusSel){const o=langOptions();(o.find(x=>x.getAttribute('aria-selected')==='true')||o[0]).focus()}}
function closeLang(back){langList.hidden=true;langBtn.setAttribute('aria-expanded','false');langMenu.classList.remove('open');if(back)langBtn.focus()}
function pickLang(code){langSelect.value=code;langSelect.dispatchEvent(new Event('change'));closeLang(true)}
langBtn.addEventListener('click',()=>{langList.hidden?openLang(false):closeLang(false)});
langBtn.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();openLang(true)}});
langList.addEventListener('click',e=>{const o=e.target.closest('[role=option]');if(o)pickLang(o.dataset.lang)});
langList.addEventListener('keydown',e=>{const o=langOptions(),i=o.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();o[(i+1)%o.length].focus()}else if(e.key==='ArrowUp'){e.preventDefault();o[(i-1+o.length)%o.length].focus()}else if(e.key==='Home'){e.preventDefault();o[0].focus()}else if(e.key==='End'){e.preventDefault();o[o.length-1].focus()}else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(i>=0)pickLang(o[i].dataset.lang)}else if(e.key==='Escape'){e.preventDefault();closeLang(true)}else if(e.key==='Tab'){closeLang(false)}});
document.addEventListener('click',e=>{if(!langMenu.contains(e.target))closeLang(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!langList.hidden)closeLang(true)});
syncLang(langSelect.value);

const nav=document.getElementById('nav'),menu=document.getElementById('menu');menu.addEventListener('click',()=>{let open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}));document.getElementById('year').textContent=new Date().getFullYear();const WA_NUMBER=window.ASYA_WP.phone;document.getElementById('inquiry').addEventListener('submit',e=>{e.preventDefault();const d=dictionary[document.getElementById('lang').value]||dictionary.en,v=id=>document.getElementById(id).value.trim(),sel=document.getElementById('interest'),lines=[d.wa_hello,d.wa_name+': '+v('name'),d.wa_interest+': '+sel.options[sel.selectedIndex].text];if(v('email'))lines.push(d.wa_email+': '+v('email'));if(v('message'))lines.push(d.wa_message+': '+v('message'));deliver((e.submitter&&e.submitter.dataset.channel)||'whatsapp',lines.join('\n'),document.getElementById('status'),d)});function deliver(channel,text,status,d){if(channel==='whatsapp'){status.textContent=d.status;openChat('https://wa.me/'+WA_NUMBER+'?text='+encodeURIComponent(text))}else{status.textContent=d.status_copy;try{navigator.clipboard.writeText(text).catch(()=>{status.textContent=text})}catch(err){status.textContent=text}openChat(channel==='viber'?'viber://chat?number=%2B'+WA_NUMBER:'https://t.me/+'+WA_NUMBER)}}function openChat(url){if(url.indexOf('viber:')===0){window.location.href=url}else{window.open(url,'_blank','noopener')}}document.querySelectorAll('[data-interest]').forEach(a=>a.addEventListener('click',()=>{document.getElementById('interest').value=a.dataset.interest}));
const sections=[...document.querySelectorAll('main section[id]')],links=[...nav.querySelectorAll('a:not(.nav-cta)')];function markActive(){let cur='home',y=window.scrollY+140;sections.forEach(sec=>{if(sec.offsetTop<=y)cur=sec.id});links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+cur))}window.addEventListener('scroll',markActive,{passive:true});markActive();


/* Gallery lightbox */
(function(){const box=document.getElementById('lightbox'),img=document.getElementById('lbImg'),cap=document.getElementById('lbCap'),thumbs=[...document.querySelectorAll('#gallery .gthumb img')];let cur=0;if(!box||!thumbs.length)return;
function big(src){return src.replace(/([?&]w=)\d+/,'$11800')}
function show(i){cur=(i+thumbs.length)%thumbs.length;const t=thumbs[cur];img.src=big(t.currentSrc||t.src);img.alt=t.alt||'';cap.textContent=t.alt||''}
function open(i){show(i);if(box.showModal){box.showModal()}else{box.setAttribute('open','')}}
function close(){box.close?box.close():box.removeAttribute('open')}
thumbs.forEach((t,i)=>t.closest('.gthumb').addEventListener('click',()=>open(i)));
document.getElementById('lbClose').addEventListener('click',close);document.getElementById('lbPrev').addEventListener('click',()=>show(cur-1));document.getElementById('lbNext').addEventListener('click',()=>show(cur+1));
box.addEventListener('click',e=>{if(e.target===box)close()});
box.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();show(cur-1)}else if(e.key==='ArrowRight'){e.preventDefault();show(cur+1)}});
let x0=null;box.addEventListener('pointerdown',e=>{x0=e.clientX});box.addEventListener('pointerup',e=>{if(x0===null)return;const dx=e.clientX-x0;x0=null;if(Math.abs(dx)>60)show(dx<0?cur+1:cur-1)});
})();

/* Fade-in on scroll */
(function(){if(!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.documentElement.classList.add('js');
const groups=['.strip .perk','.section .heading','.cards .card','.aboutgrid > *','.contactgrid > *','.rating-summary','.review-empty','.review-cta'];const seen=new Set();
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -40px 0px'});
groups.forEach(sel=>document.querySelectorAll(sel).forEach((el,i)=>{if(seen.has(el))return;seen.add(el);el.classList.add('reveal');el.style.transitionDelay=Math.min(i%4,3)*90+'ms';io.observe(el)}));
setTimeout(()=>document.querySelectorAll('.reveal:not(.in)').forEach(el=>{const r=el.getBoundingClientRect();if(r.top<innerHeight)el.classList.add('in')}),1500);
})();

