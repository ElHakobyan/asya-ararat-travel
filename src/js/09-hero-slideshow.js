// A single clock gives every photo the same hold and dissolve, including the loop.
(async function initHeroSlideshow(){
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  const controls = document.querySelector('.hero-playback');
  const pauseButton = document.querySelector('.hero-pause');
  const counter = document.querySelector('.hero-count');
  const progress = document.querySelector('.hero-progress');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const loaded = await Promise.all(slides.map(async slide => {
    try { await slide.decode(); return slide; } catch { return null; }
  }));
  const ready = loaded.filter(Boolean);
  if (!ready.length) return;
  slides.forEach(slide => slide.classList.remove('is-active'));
  const transitionMs = 4000, holdMs = 7000;
  let current = 0, timer, paused = false, transitioning = false;
  ready[current].classList.add('is-active');
  if (ready.length < 2) return;
  controls.hidden = false;
  function updateCounter(){
    counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(ready.length).padStart(2, '0');
  }
  function schedule(){
    clearTimeout(timer);
    progress.classList.remove('is-running');
    if (paused || document.hidden || motion.matches || transitioning) return;
    // Restart the indicator for a full, equal hold after each completed dissolve.
    void progress.offsetWidth;
    progress.classList.add('is-running');
    timer = setTimeout(advance, holdMs);
  }
  function advance(){
    if (paused || document.hidden || motion.matches) return schedule();
    transitioning = true;
    progress.classList.remove('is-running');
    const outgoing = ready[current];
    current = (current + 1) % ready.length;
    const incoming = ready[current];
    outgoing.classList.add('is-previous');
    incoming.classList.add('is-entering');
    incoming.classList.add('is-active');
    updateCounter();
    setTimeout(() => {
      outgoing.classList.remove('is-active', 'is-previous');
      incoming.classList.remove('is-entering');
      transitioning = false;
      schedule();
    }, transitionMs);
  }
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    pauseButton.textContent = paused ? '▶' : 'Ⅱ';
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.setAttribute('aria-label', paused ? 'Շարունակել սլայդները' : 'Դադարեցնել սլայդները');
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', schedule);
  updateCounter();
  schedule();
})();
