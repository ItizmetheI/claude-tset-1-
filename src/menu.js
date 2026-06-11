import gsap from 'gsap';

export function initMenu(lenis){
  const toggle = document.getElementById('menuToggle');
  const links = document.querySelectorAll('[data-menu-link]');
  const clockEl = document.getElementById('menuClock');

  let open = false;

  function setOpen(state){
    open = state;
    document.documentElement.classList.toggle('menu-open', open);

    if(open){
      gsap.fromTo(links, {
        yPercent: 110,
        opacity: 0
      }, {
        yPercent: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power4.out',
        stagger: 0.06,
        delay: 0.15
      });
      gsap.fromTo('.menu-overlay__footer', {
        opacity: 0,
        y: 20
      }, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        delay: 0.4
      });
      lenis?.stop();
    } else {
      lenis?.start();
    }
  }

  toggle.addEventListener('click', () => setOpen(!open));

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      setOpen(false);
      setTimeout(() => {
        if(target){
          lenis ? lenis.scrollTo(target, { duration: 1.4 }) : target.scrollIntoView({ behavior: 'smooth' });
        }
      }, 400);
    });
  });

  // live clock
  function tick(){
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${h}:${m}:${s}`;
  }
  tick();
  setInterval(tick, 1000);

  return { setOpen };
}
