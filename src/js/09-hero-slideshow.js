// A single clock gives every photo the same hold and dissolve, including the loop.
(async function initHeroSlideshow(){
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  const controls = document.querySelector('.hero-playback');
  const counter = document.querySelector('.hero-count');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const loaded = await Promise.all(slides.map(async slide => {
    try { await slide.decode(); return slide; } catch { return null; }
  }));
  const ready = loaded.filter(Boolean);
  if (!ready.length) return;
  slides.forEach(slide => slide.classList.remove('is-active'));
  const transitionMs = 3000, holdMs = 7000;
  let current = 0, timer, transitioning = false;
  ready[current].classList.add('is-active');
  if (ready.length < 2) return;
  controls.hidden = false;
  function updateCounter(){
    counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(ready.length).padStart(2, '0');
  }
  function schedule(){
    clearTimeout(timer);
    if (document.hidden || motion.matches || transitioning) return;
    timer = setTimeout(advance, holdMs);
  }
  function advance(){
    if (document.hidden || motion.matches) return schedule();
    transitioning = true;
    const outgoing = ready[current];
    current = (current + 1) % ready.length;
    const incoming = ready[current];
    outgoing.classList.add('is-previous');
    incoming.classList.add('is-entering');
    incoming.classList.add('is-active');
    updateCounter();
    const dissolve = incoming.animate([{opacity:0},{opacity:1}], {
      duration:transitionMs, easing:'linear'
    });
    dissolve.finished.then(() => {
      outgoing.classList.remove('is-active', 'is-previous');
      incoming.classList.remove('is-entering');
      transitioning = false;
      schedule();
    });
  }
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', schedule);
  updateCounter();
  schedule();
})();
