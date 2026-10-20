'use strict';
document.documentElement.classList.add('js');

const menuButton = document.querySelector('.nav-toggle');
const navigation = document.querySelector('#primary-navigation');
if (menuButton && navigation) {
  const closeMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  };
  menuButton.addEventListener('click', () => {
    const opening = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(opening));
    navigation.classList.toggle('is-open', opening);
  });
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
}

const filterButtons = [...document.querySelectorAll('[data-filter]')];
const filterItems = [...document.querySelectorAll('[data-category]')];
const resultCount = document.querySelector('[data-result-count]');
if (filterButtons.length && filterItems.length) {
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.filter;
    filterButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    let visible = 0;
    filterItems.forEach(item => {
      const show = category === 'all' || item.dataset.category.split(' ').includes(category);
      item.hidden = !show;
      if (show) visible += 1;
    });
    if (resultCount) resultCount.textContent = `${visible} 个项目与实验`;
  }));
}

const imageLinks = [...document.querySelectorAll('[data-lightbox]')];
if (imageLinks.length && 'HTMLDialogElement' in window) {
  const dialog = document.createElement('dialog');
  dialog.className = 'image-dialog';
  dialog.setAttribute('aria-label', '查看项目图片');
  dialog.innerHTML = '<button type="button" class="dialog-close" aria-label="关闭图片">×</button><img alt=""><p></p>';
  document.body.append(dialog);
  let previousFocus;
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('p');
  const close = () => dialog.close();
  dialog.querySelector('button').addEventListener('click', close);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener('close', () => {
    if (previousFocus) previousFocus.focus();
  });
  imageLinks.forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    previousFocus = link;
    image.src = link.href;
    image.alt = link.querySelector('img')?.alt || '';
    caption.textContent = link.closest('figure')?.querySelector('figcaption')?.textContent || image.alt;
    dialog.showModal();
  }));
}

const caseLinks = [...document.querySelectorAll('.case-nav a')];
if (caseLinks.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      caseLinks.forEach(link => link.classList.toggle('is-active', link.hash === `#${entry.target.id}`));
    });
  }, {rootMargin: '-15% 0px -65% 0px', threshold: 0});
  caseLinks.forEach(link => {
    const section = document.getElementById(link.hash.slice(1));
    if (section) observer.observe(section);
  });
}

// Only the home page behaves as a chapter presentation. Long pages keep native reading.
(() => {
  const home = document.querySelector('.home-chapters');
  if (!home) return;
  const sections = [...home.querySelectorAll(':scope > .chapter')];
  const links = [...document.querySelectorAll('[data-chapter-link]')];
  if (!sections.length) return;
  const root = document.documentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let headerHeight = 84;
  let available = innerHeight - headerHeight;
  let framePending = false;
  let gateUntil = 0;
  let lastWheelAt = 0;
  let wheelLocked = false;
  let carry = 0;
  let lastDirection = 0;
  root.classList.add('chapter-mode');

  const obstructed = () => document.querySelector('dialog[open]') || menuButton?.getAttribute('aria-expanded') === 'true';
  const editable = target => target instanceof Element && target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]');

  function measure() {
    if (!obstructed()) headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 84;
    available = Math.max(1, innerHeight - headerHeight);
    root.style.setProperty('--chapter-header', `${headerHeight}px`);
    schedule();
  }

  function paint() {
    framePending = false;
    const probe = headerHeight + available * .45;
    current = 0;
    sections.forEach((section, index) => {
      const bounds = section.getBoundingClientRect();
      if (bounds.top <= probe) current = index;
      const distance = bounds.top - headerHeight;
      const animate = !motion.matches && bounds.height <= available + 4;
      const strength = animate ? Math.min(1, Math.abs(distance) / (available * .9)) : 0;
      section.style.setProperty('--chapter-opacity', String(1 - .4 * strength));
      section.style.setProperty('--chapter-shift', `${Math.sign(distance) * 18 * strength}px`);
    });
    sections.forEach((section,index) => section.classList.toggle('is-current', index === current));
    links.forEach((link,index) => {
      if (index === current) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    root.dataset.chapter = sections[current].dataset.chapter;
    root.style.setProperty('--chapter-progress', String(current / Math.max(1, sections.length - 1)));
  }

  function schedule() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(paint);
  }

  function navigate(index, {focus = false, historyMode = 'replace'} = {}) {
    const section = sections[index];
    if (!section) return;
    gateUntil = performance.now() + (motion.matches ? 0 : 800);
    const top = section.getBoundingClientRect().top + scrollY - headerHeight;
    window.scrollTo({top, behavior: motion.matches ? 'instant' : 'smooth'});
    if (historyMode) {
      const hash = index === 0 ? '' : `#${section.id}`;
      try { history[historyMode === 'push' ? 'pushState' : 'replaceState'](null, '', location.pathname + location.search + hash); } catch (_) { /* file previews can restrict history */ }
    }
    if (focus) {
      const heading = section.querySelector('h1,h2');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({preventScroll: true});
      }
    }
    schedule();
  }

  // Oversized chapters scroll naturally until their content boundary is reached.
  function canLeave(direction) {
    const bounds = sections[current].getBoundingClientRect();
    if (bounds.height <= available + 4) return true;
    return direction > 0 ? bounds.bottom <= innerHeight + 3 : bounds.top >= headerHeight - 3;
  }

  document.addEventListener('wheel', event => {
    if (motion.matches || innerWidth <= 760 || event.ctrlKey || event.metaKey || obstructed() || editable(event.target)) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
    if (event.target.closest('.table-wrap,.system-figure')) return;
    const direction = Math.sign(event.deltaY);
    const next = current + direction;
    if (next < 0 || next >= sections.length || !canLeave(direction)) return;
    const now = performance.now();
    const gap = now - lastWheelAt;
    lastWheelAt = now;
    event.preventDefault();
    if (now < gateUntil || (wheelLocked && gap < 180)) return;
    if (gap >= 180 || direction !== lastDirection) { carry = 0; wheelLocked = false; }
    lastDirection = direction;
    carry += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? available : 1);
    if (Math.abs(carry) < 42) return;
    carry = 0;
    wheelLocked = true;
    navigate(next);
  }, {passive: false});

  document.addEventListener('keydown', event => {
    if (motion.matches || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || obstructed() || editable(event.target)) return;
    let next;
    const direction = ['PageDown','ArrowDown',' '].includes(event.key) ? (event.shiftKey && event.key === ' ' ? -1 : 1) : ['PageUp','ArrowUp'].includes(event.key) ? -1 : 0;
    if (event.key === ' ' && event.target.closest('button,a')) return;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = sections.length - 1;
    else if (direction && canLeave(direction)) next = current + direction;
    if (next === undefined || next < 0 || next >= sections.length) return;
    event.preventDefault();
    if (performance.now() < gateUntil) return;
    navigate(next, {focus: true});
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    const chapter = target?.closest('.chapter');
    const index = sections.indexOf(chapter);
    if (index < 0) return;
    event.preventDefault();
    navigate(index, {focus: true, historyMode: 'push'});
  });
  window.addEventListener('popstate', () => {
    const target = document.getElementById(location.hash.slice(1) || 'intro')?.closest('.chapter');
    const index = sections.indexOf(target);
    if (index >= 0) navigate(index, {historyMode: false});
  });
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', measure, {passive: true});
  motion.addEventListener('change', schedule);
  measure();
})();
