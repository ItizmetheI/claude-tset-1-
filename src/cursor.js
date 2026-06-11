export function initCursor(){
  const cursor = document.querySelector('.cursor');
  const dot = cursor.querySelector('.cursor__dot');
  const ring = cursor.querySelector('.cursor__ring');
  const label = cursor.querySelector('.cursor__label');

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const ringPos = { x: pos.x, y: pos.y };

  window.addEventListener('pointermove', (e) => {
    pos.x = e.clientX;
    pos.y = e.clientY;
    dot.style.left = `${pos.x}px`;
    dot.style.top = `${pos.y}px`;
    label.style.left = `${pos.x}px`;
    label.style.top = `${pos.y}px`;
  });

  window.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
  window.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));
  window.addEventListener('mousedown', () => cursor.classList.add('is-active'));
  window.addEventListener('mouseup', () => cursor.classList.remove('is-active'));

  function raf(){
    ringPos.x += (pos.x - ringPos.x) * 0.18;
    ringPos.y += (pos.y - ringPos.y) * 0.18;
    ring.style.left = `${ringPos.x}px`;
    ring.style.top = `${ringPos.y}px`;
    requestAnimationFrame(raf);
  }
  raf();

  // Hover states
  const hoverables = document.querySelectorAll('a, button, [data-magnetic]');
  hoverables.forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
  });

  // Project rows -> "View" label cursor
  document.querySelectorAll('[data-project]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('is-text');
      label.textContent = 'View';
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('is-text');
    });
  });

  return { cursor };
}

export function initMagnetic(){
  const els = document.querySelectorAll('[data-magnetic]');
  els.forEach((el) => {
    let bound = el;
    const strength = 0.4;

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      bound.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });

    el.addEventListener('mouseleave', () => {
      bound.style.transform = 'translate(0px, 0px)';
    });
  });
}
