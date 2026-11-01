// Hold the outgoing photo fully opaque beneath the four-second dissolve.
(async function initHeroSlideshow(){
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const loaded = await Promise.all(slides.map(async slide => {
    try { await slide.decode(); return slide; } catch { return null; }
  }));
  const ready = loaded.filter(Boolean);
  if (!ready.length) return;
  slides.forEach(slide => slide.classList.remove('is-active'));
  const transitionMs = 4000;
  const holdMs = 7000;
  let current = 0;
  ready[current].classList.add('is-active');
  if (ready.length < 2) return;
  setInterval(() => {
    if (document.hidden || motion.matches) return;
    const outgoing = ready[current];
    current = (current + 1) % ready.length;
    const incoming = ready[current];
    outgoing.classList.add('is-previous');
    incoming.classList.add('is-entering');
    incoming.classList.add('is-active');
    setTimeout(() => {
      outgoing.classList.remove('is-active', 'is-previous');
      incoming.classList.remove('is-entering');
    }, transitionMs);
  }, holdMs + transitionMs);
})();
