import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { initCursor, initMagnetic } from './cursor.js';
import { runPreloader } from './preloader.js';
import { initMenu } from './menu.js';
import { heroIntro, initScrollAnimations } from './scrollAnimations.js';
import { World } from './webgl/World.js';
import { ProjectPreview } from './webgl/ProjectPreview.js';

gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------
   Smooth scroll (Lenis) wired into GSAP ticker
--------------------------------------------------- */
const lenis = new Lenis({
  duration: 1.15,
  smoothWheel: true,
  syncTouch: false
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

/* ---------------------------------------------------
   Core UI chrome
--------------------------------------------------- */
initCursor();
initMagnetic();
initMenu(lenis);

/* ---------------------------------------------------
   Cinematic 3D world + project preview
--------------------------------------------------- */
let world, projectPreview;

function initScenes(){
  const worldEl = document.getElementById('worldCanvas');
  if(worldEl) world = new World(worldEl);

  const previewEl = document.getElementById('projectPreviewCanvas');
  if(previewEl) projectPreview = new ProjectPreview(previewEl);

  // Drive the entire camera journey from total page scroll progress
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.3,
    onUpdate: (self) => {
      world?.setProgress(self.progress);
    }
  });
}

/* ---------------------------------------------------
   Hero coordinate readout
--------------------------------------------------- */
function initHeroCoords(){
  const xEl = document.getElementById('heroCoordX');
  const yEl = document.getElementById('heroCoordY');
  if(!xEl || !yEl) return;

  window.addEventListener('pointermove', (e) => {
    const x = (e.clientX / window.innerWidth).toFixed(3);
    const y = (e.clientY / window.innerHeight).toFixed(3);
    xEl.textContent = `X ${x}`;
    yEl.textContent = `Y ${y}`;
  });
}

/* ---------------------------------------------------
   Project hover preview (WebGL)
--------------------------------------------------- */
function initProjectPreview(){
  const preview = document.getElementById('projectPreview');
  const projects = document.querySelectorAll('[data-project]');
  if(!preview || !projects.length) return;

  let lastX = 0, lastY = 0;
  let active = false;

  gsap.set(preview, { xPercent: -50, yPercent: -50, scale: 0.85, rotate: -4 });

  const quickX = gsap.quickTo(preview, 'x', { duration: 0.5, ease: 'power3.out' });
  const quickY = gsap.quickTo(preview, 'y', { duration: 0.5, ease: 'power3.out' });

  window.addEventListener('pointermove', (e) => {
    quickX(e.clientX);
    quickY(e.clientY);

    if(active && projectPreview){
      const vx = e.clientX - lastX;
      const vy = e.clientY - lastY;
      projectPreview.setVelocity(vx * 0.05, -vy * 0.05);
    }
    lastX = e.clientX;
    lastY = e.clientY;
  });

  projects.forEach((el, index) => {
    el.addEventListener('mouseenter', () => {
      active = true;
      preview.classList.add('is-active');
      gsap.to(preview, { scale: 1, rotate: -2, duration: 0.5, ease: 'power3.out' });
      const color = el.dataset.color || '#7c5cff';
      projectPreview?.setColor(color);
      world?.setHover(index, true, color);
    });
    el.addEventListener('mouseleave', () => {
      active = false;
      preview.classList.remove('is-active');
      gsap.to(preview, { scale: 0.85, rotate: -4, duration: 0.5, ease: 'power3.out' });
      world?.setHover(index, false);
    });
  });
}

/* ---------------------------------------------------
   Boot sequence
--------------------------------------------------- */
function boot(){
  initScenes();
  initHeroCoords();
  initProjectPreview();
  initScrollAnimations();
  heroIntro();

  // Refresh ScrollTrigger once layout settles (fonts, canvases)
  requestAnimationFrame(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

if(document.fonts?.ready){
  document.fonts.ready.then(() => runPreloader(boot));
} else {
  runPreloader(boot);
}
