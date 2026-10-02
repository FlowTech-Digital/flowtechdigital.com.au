(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const nav = document.querySelector('nav');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  const small = window.matchMedia('(max-width: 860px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const updateHeight = () => {
    if (nav) document.documentElement.style.setProperty('--nav-h', `${nav.offsetHeight}px`);
  };
  const setMenu = (open, returnFocus = false) => {
    if (!toggle || !links) return;
    toggle.classList.toggle('open', open);
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (returnFocus) toggle.focus();
  };
  updateHeight();
  window.addEventListener('resize', updateHeight);
  if (document.fonts) document.fonts.ready.then(updateHeight);
  if (toggle && links) {
    links.id = 'site-menu';
    toggle.setAttribute('aria-controls', 'site-menu');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      setMenu(open);
      if (open) links.querySelector('a')?.focus();
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') { e.preventDefault(); setMenu(false, true); }
      if (e.key === 'Tab') {
        const items = [toggle, ...links.querySelectorAll('a')];
        const index = items.indexOf(document.activeElement);
        if (e.shiftKey && index <= 0) { e.preventDefault(); items.at(-1).focus(); }
        else if (!e.shiftKey && index === items.length - 1) { e.preventDefault(); toggle.focus(); }
      }
    });
    small.addEventListener('change', () => setMenu(false));
  }
  const current = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (new URL(a.href, location.href).pathname === current) a.setAttribute('aria-current', 'page');
  });
  const announce = (name, details) => {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, details); }
    catch (_) { /* Analytics must not interrupt navigation. */ }
  };
  document.querySelectorAll('a[href^="tel:"],a[href^="mailto:"]').forEach(a => {
    a.addEventListener('click', () => announce('contact_click', {
      contact_method: a.getAttribute('href').startsWith('tel:') ? 'phone' : 'email'
    }));
  });
  document.querySelectorAll('a[href*="offer="]').forEach(a => {
    a.addEventListener('click', () => {
      const allowed = ['website-fix-sprint','brand-polish','launch','business','pro','logo-essentials','brand-identity','brand-launch','ai-starter','ai-professional','ai-enterprise','care-basic','care-standard','care-plus','not-sure'];
      const offer = new URL(a.href, location.href).searchParams.get('offer');
      if (allowed.includes(offer)) announce('offer_select', { offer_id: offer });
    });
  });
  // Content is always visible. This is only a scroll preference helper.
  window.flowTechScrollOptions = { behavior: reduced.matches ? 'auto' : 'smooth' };
})();
