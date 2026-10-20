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
