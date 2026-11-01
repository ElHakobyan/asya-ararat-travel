// Crossfade only after every original image has loaded, avoiding blank frames.
(async function initHeroSlideshow(){
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (slides.length < 2) return;
  const loaded = await Promise.all(slides.map(async (slide) => {
    try { await slide.decode(); return slide; } catch { return null; }
  }));
  const ready = loaded.filter(Boolean);
  if (!ready.length) return;
  slides.forEach(slide => slide.classList.remove('is-active'));
  let current = 0;
  ready[current].classList.add('is-active');
  if (ready.length < 2) return;
  setInterval(() => {
    if (document.hidden || motion.matches) return;
    ready[current].classList.remove('is-active');
    current = (current + 1) % ready.length;
    ready[current].classList.add('is-active');
  }, 6000);
})();
