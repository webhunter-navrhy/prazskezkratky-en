/* Prague Shortcuts — interactions (no scroll libraries: native scroll + IntersectionObserver) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  document.documentElement.classList.remove('no-js');

  // nav: background after scrolling
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // mobile menu
  const toggle = $('#toggle'), menu = $('#menu');
  const setMenu = open => { menu.classList.toggle('open', open); toggle.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : ''; };
  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));

  // hero headline: word by word
  $$('.words').forEach(h => {
    let i = 0;
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span'); w.className = 'w';
          const inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', i++);
          w.append(inner); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(h);
  });

  // reveal on scroll
  // (clip-path hides the element from IntersectionObserver, so .clip is watched through its parent)
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const t = e.target;
    (t._clips || [t]).forEach(el => el.classList.add('vis')); io.unobserve(t);
  }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  $$('.reveal').forEach(el => io.observe(el));
  $$('.clip').forEach(el => { const p = el.parentElement; (p._clips = p._clips || []).push(el); io.observe(p); });

  // counters
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, end = +el.dataset.count, t0 = performance.now(), d = 1600;
    const tick = t => { const p = Math.min(1, (t - t0) / d); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
    el.textContent = '0'; requestAnimationFrame(tick); cio.unobserve(el);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  // toast for parts that are only a sample in this proposal
  const toast = $('#toast'); let tt;
  const say = msg => { toast.textContent = msg; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 3200); };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-sample]');
    if (!a) return;
    e.preventDefault();
    say('This is a design proposal — for now, the St Wenceslas walk is the sample guide page.');
  });
  $$('[data-sample-form]').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); say('Thanks! (Sample form — not connected yet.)'); }));

  // guide library: chips + planner
  const cards = $$('#cards .card');
  if (cards.length) {
    const chips = $$('.chip'), note = $('#libNote'), empty = $('#libEmpty'), count = $('#planCount'), form = $('#plan');
    const TIME = { short: ['short'], half: ['short', 'half'], full: ['short', 'half', 'full'] };
    const show = test => {
      let n = 0;
      cards.forEach(c => {
        const ok = test(c); c.classList.toggle('hide', !ok);
        if (ok) { n++; c.classList.remove('in'); void c.offsetWidth; c.classList.add('in'); }
      });
      empty.hidden = n > 0; return n;
    };
    const planTest = () => {
      const f = new FormData(form), who = f.get('who'), time = f.get('time'), wet = f.get('weather') === 'rain';
      return c => {
        const d = k => c.dataset[k].split(' ');
        return (who === 'all' || d('who').includes(who)) && d('time').some(t => TIME[time].includes(t)) && (!wet || d('weather').includes('rain'));
      };
    };
    const updateCount = () => {
      const t = planTest(), n = cards.filter(t).length;
      count.innerHTML = n ? `<b>${n}</b> tested idea${n > 1 ? 's' : ''} match` : 'No exact match — try another combination';
    };
    // selects only as wide as the chosen option
    const meas = document.createElement('span'); meas.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:italic 400 1em/1.2 var(--serif)';
    const fit = sel => { sel.parentNode.append(meas); meas.textContent = sel.options[sel.selectedIndex].text; sel.style.setProperty('--w', `calc(${meas.offsetWidth}px + 1.15em)`); meas.remove(); };
    const sels = $$('select', form); sels.forEach(fit);
    document.fonts && document.fonts.ready.then(() => sels.forEach(fit));
    form.addEventListener('change', e => { if (e.target.tagName === 'SELECT') fit(e.target); updateCount(); }); updateCount();
    form.addEventListener('submit', e => {
      e.preventDefault();
      const n = show(planTest());
      chips.forEach(c => c.classList.remove('on'));
      const f = new FormData(form), sel = k => form.querySelector(`[name=${k}] option:checked`).textContent;
      note.innerHTML = `Ideas for <b>${sel('who')}</b>, <b>${sel('time')}</b>${f.get('weather') === 'rain' ? ', <b>rainy</b>' : ''} — ${n} found. <button type="button" class="linkbtn" data-reset>Show all guides</button>`;
      note.hidden = false;
      $('#guides').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    chips.forEach(ch => ch.addEventListener('click', () => {
      chips.forEach(c => c.classList.toggle('on', c === ch)); note.hidden = true;
      const tag = ch.dataset.tag;
      show(c => tag === 'all' || c.dataset.tags.split(' ').includes(tag));
    }));
    document.addEventListener('click', e => {
      if (!e.target.closest('[data-reset]')) return;
      chips.forEach(c => c.classList.toggle('on', c.dataset.tag === 'all')); note.hidden = true; show(() => true);
    });
  }

  // season rows: image follows the cursor (desktop only)
  const prev = $('#rowPreview');
  if (prev && matchMedia('(hover: hover) and (min-width: 721px)').matches) {
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, active = false;
    const loop = () => { x += (tx - x) * .18; y += (ty - y) * .18; prev.style.transform = `translate3d(${x + 24}px, ${y - 110}px, 0)`; if (active || Math.abs(tx - x) > .5) raf = requestAnimationFrame(loop); else raf = 0; };
    $$('.row[data-img]').forEach(r => {
      r.addEventListener('mouseenter', e => { prev.style.backgroundImage = `url(${r.dataset.img})`; prev.classList.add('on'); active = true; tx = x = e.clientX; ty = y = e.clientY; if (!raf) raf = requestAnimationFrame(loop); });
      r.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
      r.addEventListener('mouseleave', () => { prev.classList.remove('on'); active = false; });
    });
  }

  // horizontal scroller: drag with mouse
  const hs = $('#hscroll');
  if (hs) {
    let down = false, sx = 0, sl = 0, moved = 0;
    hs.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = hs.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; moved = Math.abs(dx); if (moved > 4) hs.classList.add('drag'); hs.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { down = false; hs.classList.remove('drag'); });
  }

  // guide page: highlight current stop
  const toc = $$('[data-toc]');
  if (toc.length) {
    const map = new Map(toc.map(a => [a.getAttribute('href').slice(1), a]));
    const tio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { toc.forEach(a => a.classList.remove('on')); map.get(e.target.id)?.classList.add('on'); }
    }), { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((a, id) => { const s = document.getElementById(id); if (s) tio.observe(s); });
  }
})();
