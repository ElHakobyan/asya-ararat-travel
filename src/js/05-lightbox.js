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
