// One-time orientation cues. All content remains visible without this module.
const main = document.querySelector<HTMLElement>('main');
const desktop = matchMedia('(min-width: 1101px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const animations = new Set<Animation>();
let observer: IntersectionObserver | undefined;
let progress: HTMLElement | undefined;
let scrollFrame = 0;
let resizeTimer = 0;
const excluded = '.notice,.safety-notice,.article-safety,.blog-safety,form,.review-note,details:not([open])';
const clean = () => {
 observer?.disconnect();
 animations.forEach(animation => animation.cancel());
 animations.clear();
 document.querySelectorAll('[data-reading-motion]').forEach(element => {
  element.removeAttribute('data-reading-motion');
  element.removeAttribute('data-motion-align');
  element.classList.remove('mgi-motion-heading');
 });
 document.querySelectorAll('.mgi-motion-mark').forEach(element => element.remove());
 progress?.remove(); progress = undefined;
};
const trackReading = () => {
 if (!progress || !main) return;
 const start = main.getBoundingClientRect().top + scrollY;
 const distance = Math.max(1, main.offsetHeight - innerHeight);
 const fraction = Math.max(0, Math.min(1, (scrollY - start) / distance));
 progress.style.transform = `scaleX(${fraction})`;
};
const setup = () => {
 clean();
 if (!main || !desktop.matches || reduced.matches || !('IntersectionObserver' in window)) return;
 const page = document.body.dataset.pageId;
 // Task and policy pages stay still. Completion and safety take precedence.
 if (['ST-004','ST-009','ST-014','ST-015','ST-016','ST-017','ST-018','ST-019'].includes(page || '')) {
  main.dataset.motionPolicy = 'task-or-policy-exception'; return;
 }
 if (main.querySelector('.answer-article,[data-blog-family="article"]')) {
  main.dataset.motionPolicy = 'scroll-linked-reading-progress';
  progress = document.createElement('div');
  progress.className = 'mgi-reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress); trackReading(); return;
 }
 main.dataset.motionPolicy = 'section-cues';
 const candidates = [...main.querySelectorAll<HTMLElement>('.polaroid,h2,h3,h4')]
  .filter(element => !element.closest(excluded) && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
  .map(element => ({element, y: Math.round(element.getBoundingClientRect().top + scrollY)}))
  .sort((a,b) => a.y-b.y);
 const hero = main.querySelector<HTMLElement>('.hero .polaroid');
 let previous = hero ? Math.round(hero.getBoundingClientRect().top + scrollY) : 0;
 const selected: typeof candidates = [];
 while (true) {
  const later = candidates.filter(item => item.y >= previous + 650 && !item.element.closest('.hero'));
  if (!later.length) break;
  const window = later.filter(item => item.y <= previous + 1150);
  const next = window.length ? window.reduce((best,item) => Math.abs(item.y-previous-900) < Math.abs(best.y-previous-900) ? item : best) : later[0];
  selected.push(next); previous = next.y;
 }
 // Dense grids sometimes need one closer cue to avoid a full still screen.
 const end = Math.round(main.getBoundingClientRect().bottom + scrollY);
 const boundaries = [{y: hero ? Math.round(hero.getBoundingClientRect().top + scrollY) : 0}, ...selected, {y:end}];
 for (let i=1;i<boundaries.length;i++) {
  const from=boundaries[i-1].y, to=boundaries[i].y;
  if (to-from<=1200) continue;
  const inside=candidates.filter(item=>item.y>from+350&&item.y<to-350&&!item.element.closest('.hero')&&!selected.includes(item));
  if (inside.length) selected.push(inside.reduce((best,item)=>Math.abs(item.y-(from+to)/2)<Math.abs(best.y-(from+to)/2)?item:best));
 }
 selected.sort((a,b)=>a.y-b.y);
 observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
   if (!entry.isIntersecting) continue;
   observer?.unobserve(entry.target);
   if (reduced.matches || !desktop.matches) continue;
   const element = entry.target as HTMLElement;
   const photo = element.classList.contains('polaroid');
   const target = photo ? element : element.querySelector<HTMLElement>('.mgi-motion-mark');
   if (!target || typeof target.animate !== 'function') continue;
   // Independent translate preserves the accepted Polaroid rotation.
   const animation = target.animate(photo ? [{translate:'0 12px'},{translate:'0 0'}] : [{transform:'scaleX(.12)'},{transform:'scaleX(1)'}], {
    duration: photo ? 600 : 450, easing:'cubic-bezier(.2,.65,.3,1)', iterations:1,
   });
   animations.add(animation);
   animation.finished.then(() => animations.delete(animation)).catch(() => animations.delete(animation));
  }
 }, {threshold:0, rootMargin:'0px 0px -12% 0px'});
 for (const {element} of selected) {
  element.dataset.readingMotion = element.classList.contains('polaroid') ? 'photo-settle' : 'heading-accent';
  if (!element.classList.contains('polaroid')) {
   element.classList.add('mgi-motion-heading');
   element.dataset.motionAlign = getComputedStyle(element).textAlign === 'center' ? 'center' : 'start';
   const mark = document.createElement('span'); mark.className = 'mgi-motion-mark'; mark.setAttribute('aria-hidden','true'); element.append(mark);
  }
  observer.observe(element);
 }
};
addEventListener('scroll', () => {
 if (!progress || scrollFrame) return;
 scrollFrame = requestAnimationFrame(() => {scrollFrame = 0; trackReading();});
}, {passive:true});
addEventListener('resize', () => {clearTimeout(resizeTimer); resizeTimer = window.setTimeout(setup, 180);});
reduced.addEventListener('change', setup);
desktop.addEventListener('change', setup);
if (document.readyState === 'complete') document.fonts.ready.then(setup);
else addEventListener('load', () => document.fonts.ready.then(setup), {once:true});
