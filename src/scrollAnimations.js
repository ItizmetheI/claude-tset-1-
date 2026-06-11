import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function heroIntro(){
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

  tl.fromTo('.hero__title-word', {
    yPercent: 120,
    rotate: 6
  }, {
    yPercent: 0,
    rotate: 0,
    duration: 1.2,
    stagger: 0.12
  });

  tl.fromTo('.hero__eyebrow', {
    opacity: 0,
    y: 20
  }, {
    opacity: 1,
    y: 0,
    duration: 0.8
  }, '-=0.7');

  tl.to('.hero__desc', {
    opacity: 1,
    y: 0,
    duration: 0.9
  }, '-=0.7');

  tl.to('.hero__cta', {
    opacity: 1,
    y: 0,
    duration: 0.9
  }, '-=0.75');

  return tl;
}

function splitWords(el){
  const text = el.textContent.trim();
  const words = text.split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(' ');
  return el.querySelectorAll('.word');
}

export function initScrollAnimations(){

  // Generic reveal-up elements
  gsap.utils.toArray('.reveal-up').forEach((el) => {
    if(el.closest('.hero')) return; // hero handled separately
    gsap.fromTo(el, {
      opacity: 0,
      y: 40
    }, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%'
      }
    });
  });

  // Word-by-word reveal for about copy
  gsap.utils.toArray('.reveal-words').forEach((el) => {
    const words = splitWords(el);
    gsap.to(words, {
      opacity: 1,
      stagger: 0.04,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        end: 'bottom 60%',
        scrub: 0.6
      }
    });
  });

  // Counters
  gsap.utils.toArray('[data-counter]').forEach((el) => {
    const target = parseFloat(el.dataset.counter);
    const counter = { value: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          value: target,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = Math.round(counter.value);
          }
        });
      }
    });
  });

  // Section heads slide up
  gsap.utils.toArray('.section-head').forEach((el) => {
    gsap.fromTo(el.children, {
      opacity: 0,
      y: 30
    }, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.08,
      scrollTrigger: {
        trigger: el,
        start: 'top 90%'
      }
    });
  });

  // Project rows stagger in
  gsap.utils.toArray('.project').forEach((el, i) => {
    gsap.fromTo(el, {
      opacity: 0,
      y: 60
    }, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 92%'
      }
    });
  });

  // Capability cards
  gsap.fromTo('.capability', {
    opacity: 0,
    y: 50
  }, {
    opacity: 1,
    y: 0,
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.1,
    scrollTrigger: {
      trigger: '.capabilities__grid',
      start: 'top 85%'
    }
  });

  // Process items
  gsap.utils.toArray('.process__item').forEach((el) => {
    gsap.fromTo(el, {
      opacity: 0,
      y: 40
    }, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 92%'
      }
    });
  });

  // Contact reveal
  gsap.fromTo('.contact__main > *', {
    opacity: 0,
    y: 50
  }, {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power3.out',
    stagger: 0.12,
    scrollTrigger: {
      trigger: '.contact__main',
      start: 'top 85%'
    }
  });

  // Scroll progress bar (right side)
  gsap.to('#scrollFill', {
    height: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.3
    }
  });

  // Hero scroll-line progress
  gsap.to('.hero__scroll-progress', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 0.3
    }
  });

  // Hero fade on scroll out
  gsap.to('.hero__content', {
    opacity: 0,
    y: -80,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 0.3
    }
  });
}
