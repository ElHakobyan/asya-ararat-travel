/* Fade-in on scroll */
(function(){if(!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.documentElement.classList.add('js');
const groups=['.strip .perk','.section .heading','.cards .card','.aboutgrid > *','.contactgrid > *','.rating-summary','.review-empty','.review-cta'];const seen=new Set();
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -40px 0px'});
groups.forEach(sel=>document.querySelectorAll(sel).forEach((el,i)=>{if(seen.has(el))return;seen.add(el);el.classList.add('reveal');el.style.transitionDelay=Math.min(i%4,3)*90+'ms';io.observe(el)}));
setTimeout(()=>document.querySelectorAll('.reveal:not(.in)').forEach(el=>{const r=el.getBoundingClientRect();if(r.top<innerHeight)el.classList.add('in')}),1500);
})();
