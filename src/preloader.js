import gsap from 'gsap';

export function runPreloader(onComplete){
  const preloader = document.getElementById('preloader');
  const fill = document.getElementById('preloaderFill');
  const countEl = document.getElementById('preloaderCount');
  const curtainPanels = document.querySelectorAll('.curtain__panel');

  const counter = { value: 0 };

  const tl = gsap.timeline({
    onComplete: () => {
      preloader.style.display = 'none';
      onComplete?.();
    }
  });

  tl.to(counter, {
    value: 100,
    duration: 2.0,
    ease: 'power2.inOut',
    onUpdate: () => {
      const v = Math.round(counter.value);
      countEl.textContent = String(v).padStart(2, '0');
      fill.style.width = `${v}%`;
    }
  });

  tl.to('.preloader__title span', {
    yPercent: -110,
    duration: 0.7,
    ease: 'power3.inOut',
    stagger: 0.05
  }, '+=0.1');

  tl.to(preloader, {
    yPercent: -100,
    duration: 0.9,
    ease: 'power4.inOut'
  }, '-=0.3');

  // curtain sweep reveal, staggered, in sync with preloader exit
  tl.fromTo(curtainPanels, {
    scaleY: 1
  }, {
    scaleY: 0,
    duration: 0.8,
    ease: 'power4.inOut',
    stagger: 0.08,
    transformOrigin: 'top'
  }, '-=0.85');

  return tl;
}

export function pageTransition(){
  const curtainPanels = document.querySelectorAll('.curtain__panel');
  const tl = gsap.timeline();
  tl.fromTo(curtainPanels, {
    scaleY: 0
  }, {
    scaleY: 1,
    duration: 0.5,
    ease: 'power3.in',
    stagger: 0.06,
    transformOrigin: 'bottom'
  });
  tl.to(curtainPanels, {
    scaleY: 0,
    duration: 0.5,
    ease: 'power3.out',
    stagger: 0.06,
    transformOrigin: 'top'
  });
  return tl;
}
