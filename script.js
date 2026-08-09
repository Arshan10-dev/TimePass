/* ============================================================
   UNTAMED — Cinematic Fan Tribute
   script.js — Vanilla JS only, no dependencies.
   Organized into small, independent init functions so any
   section can be edited or removed without breaking the rest.
   ============================================================ */

(() => {
  'use strict';

  /* Respect users who prefer reduced motion: skip decorative-only
     animation systems (particles, custom cursor, tilt) but keep
     core functionality (nav, lightbox, counters run instantly). */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------- */
  /* UTILITIES                                                    */
  /* ---------------------------------------------------------- */

  /** Shorthand querySelector / querySelectorAll */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /** Clamp a number between min and max */
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  /** Simple debounce for resize-type events */
  function debounce(fn, wait = 150) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  /* ---------------------------------------------------------- */
  /* 1. LOADING SCREEN                                            */
  /* ---------------------------------------------------------- */
  function initLoader() {
    const loader = $('#loader');
    const barFill = $('#loaderBarFill');
    if (!loader || !barFill) return;

    let progress = 0;
    const tick = () => {
      // Ease toward 100 so the bar feels alive rather than linear.
      progress += (100 - progress) * 0.12 + 1.2;
      progress = clamp(progress, 0, 100);
      barFill.style.width = `${progress}%`;

      if (progress < 99.5) {
        requestAnimationFrame(tick);
      } else {
        barFill.style.width = '100%';
        finishLoading();
      }
    };

    function finishLoading() {
      window.setTimeout(() => {
        loader.classList.add('loader-hidden');
        document.body.classList.add('loaded');
        // Kick off hero entrance + typing effect only once loader is gone.
        playHeroEntrance();
      }, 260);
    }

    // Start the animated bar right away; also guarantee completion
    // once the window has actually finished loading assets.
    requestAnimationFrame(tick);
    window.addEventListener('load', () => {
      progress = Math.max(progress, 92);
    });

    // Safety net: never let the loader block the site for more than 3.2s.
    window.setTimeout(() => {
      if (!document.body.classList.contains('loaded')) {
        loader.classList.add('loader-hidden');
        document.body.classList.add('loaded');
        playHeroEntrance();
      }
    }, 3200);
  }

  /* ---------------------------------------------------------- */
  /* 2. CUSTOM CURSOR                                             */
  /* ---------------------------------------------------------- */
  function initCustomCursor() {
    if (prefersReducedMotion) return;
    // Skip entirely on touch/coarse-pointer devices.
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    const dot = $('#cursorDot');
    const ring = $('#cursorRing');
    if (!dot || !ring) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    // Ring trails the dot with easing for a smooth glide feel.
    function animateRing() {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateRing);
    }
    animateRing();

    // Enlarge ring over interactive elements.
    const hoverTargets = 'a, button, [data-tilt], .gallery-item, .breed-card';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverTargets)) ring.classList.add('cursor-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverTargets)) ring.classList.remove('cursor-hover');
    });

    // Hide cursor when it leaves the viewport.
    document.addEventListener('mouseleave', () => {
      dot.classList.add('cursor-hidden');
      ring.classList.add('cursor-hidden');
    });
    document.addEventListener('mouseenter', () => {
      dot.classList.remove('cursor-hidden');
      ring.classList.remove('cursor-hidden');
    });
  }

  /* ---------------------------------------------------------- */
  /* 3. SCROLL PROGRESS BAR + NAV HORSESHOE FILL                  */
  /* ---------------------------------------------------------- */
  function initScrollProgress() {
    const bar = $('#scrollProgress');
    const horseshoeFill = $('#navHorseshoeFill');
    const circumference = 113; // matches stroke-dasharray in CSS (2 * PI * 18)

    function update() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? clamp(scrollTop / docHeight, 0, 1) : 0;

      if (bar) bar.style.width = `${pct * 100}%`;
      if (horseshoeFill) {
        horseshoeFill.style.strokeDashoffset = `${circumference * (1 - pct)}`;
      }
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', debounce(update, 150));
  }

  /* ---------------------------------------------------------- */
  /* 4. NAVBAR: scrolled state, hide-on-scroll-down, mobile menu  */
  /* ---------------------------------------------------------- */
  function initNavbar() {
    const navbar = $('#navbar');
    const toggle = $('#navToggle');
    const links = $('#navLinks');
    if (!navbar) return;

    let lastScroll = window.scrollY;

    function onScroll() {
      const current = window.scrollY;
      navbar.classList.toggle('scrolled', current > 40);

      // Hide navbar when scrolling down past hero, reveal on scroll up.
      if (current > lastScroll && current > 200 && !links.classList.contains('open')) {
        navbar.classList.add('nav-hidden');
      } else {
        navbar.classList.remove('nav-hidden');
      }
      lastScroll = current;
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    if (toggle && links) {
      toggle.addEventListener('click', () => {
        const isOpen = links.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
      });

      // Close mobile menu after a link is tapped.
      $$('.nav-link', links).forEach((link) => {
        link.addEventListener('click', () => {
          links.classList.remove('open');
          toggle.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  /* ---------------------------------------------------------- */
  /* 5. ACTIVE NAV LINK HIGHLIGHT (IntersectionObserver)          */
  /* ---------------------------------------------------------- */
  function initActiveNavHighlight() {
    const sections = $$('main section[id]');
    const navLinks = $$('.nav-link[data-nav]');
    if (!sections.length || !navLinks.length) return;

    const linkFor = (id) => navLinks.find((link) => link.getAttribute('href') === `#${id}`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const activeLink = linkFor(entry.target.id);
            if (!activeLink) return;
            navLinks.forEach((link) => link.classList.remove('active'));
            activeLink.classList.add('active');
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
  }

  /* ---------------------------------------------------------- */
  /* 6. SCROLL-REVEAL ANIMATIONS (IntersectionObserver)            */
  /*    Applies to all .reveal-* elements. Reads data-delay for   */
  /*    staggered entrances.                                      */
  /* ---------------------------------------------------------- */
  function initScrollReveals() {
    const revealEls = $$(
      '.reveal-fade-up, .reveal-fade-left, .reveal-fade-right, .reveal-scale, .reveal-blur'
    );
    if (!revealEls.length) return;

    // Elements inside the hero animate on page-load instead (see
    // playHeroEntrance), so they're excluded from scroll observation.
    const scrollTargets = revealEls.filter((el) => !el.closest('.hero'));

    if (prefersReducedMotion) {
      scrollTargets.forEach((el) => el.classList.add('in-view'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = entry.target.dataset.delay || 0;
            entry.target.style.setProperty('--reveal-delay', `${delay}ms`);
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    scrollTargets.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------- */
  /* 7. HERO ENTRANCE (runs once loader hides) + TYPING EFFECT     */
  /* ---------------------------------------------------------- */
  function playHeroEntrance() {
    const heroReveals = $$('.hero .reveal-fade-up');
    heroReveals.forEach((el) => {
      const delay = el.dataset.delay || 0;
      el.style.setProperty('--reveal-delay', `${delay}ms`);
      // Small extra offset so the typing effect (below) leads the sequence.
      window.setTimeout(() => el.classList.add('in-view'), 0);
    });

    initTypingEffect();
  }

  function initTypingEffect() {
    const target = $('#typingTarget');
    const cursorEl = $('#typingCursor');
    if (!target) return;

    const phrases = ['Untamed Spirit.', 'Unscripted Legacy.', 'One Wild Ride.'];
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    if (prefersReducedMotion) {
      target.textContent = phrases[0];
      if (cursorEl) cursorEl.style.display = 'none';
      return;
    }

    function tick() {
      const current = phrases[phraseIndex];

      if (!deleting) {
        charIndex++;
        target.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          window.setTimeout(tick, 1600); // pause on full phrase
          return;
        }
      } else {
        charIndex--;
        target.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
      }

      const speed = deleting ? 45 : 85;
      window.setTimeout(tick, speed);
    }

    window.setTimeout(tick, 400);
  }

  /* ---------------------------------------------------------- */
  /* 8. COUNT-UP NUMBERS                                          */
  /* ---------------------------------------------------------- */
  function initCountUp() {
    const counters = $$('[data-count]');
    if (!counters.length) return;

    function animateCounter(el) {
      const target = parseInt(el.dataset.count, 10) || 0;
      const suffix = el.dataset.suffix || '';
      const duration = 1600;
      const startTime = performance.now();

      function frame(now) {
        const progress = clamp((now - startTime) / duration, 0, 1);
        // easeOutCubic for a natural deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(eased * target);
        el.textContent = `${value}${suffix}`;

        if (progress < 1) requestAnimationFrame(frame);
      }

      if (prefersReducedMotion) {
        el.textContent = `${target}${suffix}`;
      } else {
        requestAnimationFrame(frame);
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );

    counters.forEach((counter) => observer.observe(counter));
  }

  /* ---------------------------------------------------------- */
  /* 9. TIMELINE FILL LINE (tied to timeline section scroll)      */
  /* ---------------------------------------------------------- */
  function initTimelineFill() {
    const section = $('#timeline');
    const fill = $('#timelineFill');
    if (!section || !fill) return;

    function update() {
      const rect = section.getBoundingClientRect();
      const viewportH = window.innerHeight;

      // Progress = how far the section has scrolled through the viewport.
      const total = rect.height + viewportH;
      const scrolled = viewportH - rect.top;
      const pct = clamp(scrolled / total, 0, 1);

      fill.style.height = `${pct * 100}%`;
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', debounce(update, 150));
  }

  /* ---------------------------------------------------------- */
  /* 10. PARALLAX BACKGROUND (cinema section)                      */
  /* ---------------------------------------------------------- */
  function initParallax() {
    if (prefersReducedMotion) return;
    const layers = $$('[data-parallax]');
    if (!layers.length) return;

    function update() {
      layers.forEach((layer) => {
        const rect = layer.parentElement.getBoundingClientRect();
        const speed = 0.12;
        const offset = rect.top * speed;
        layer.style.transform = `translate3d(0, ${offset}px, 0)`;
      });
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', debounce(update, 150));
  }

  /* ---------------------------------------------------------- */
  /* 11. IMAGE / CARD TILT EFFECT                                  */
  /* ---------------------------------------------------------- */
  function initTiltEffect() {
    if (prefersReducedMotion) return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    const tiltEls = $$('[data-tilt]');
    if (!tiltEls.length) return;

    const maxTilt = 8; // degrees

    tiltEls.forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width; // 0 - 1
        const py = (e.clientY - rect.top) / rect.height; // 0 - 1

        const tiltX = (px - 0.5) * maxTilt * 2;
        const tiltY = (0.5 - py) * maxTilt * 2;

        el.style.setProperty('--tiltX', `${tiltX}deg`);
        el.style.setProperty('--tiltY', `${tiltY}deg`);
      });

      el.addEventListener('mouseleave', () => {
        el.style.setProperty('--tiltX', '0deg');
        el.style.setProperty('--tiltY', '0deg');
      });
    });
  }

  /* ---------------------------------------------------------- */
  /* 12. BUTTON RIPPLE EFFECT                                      */
  /* ---------------------------------------------------------- */
  function initRippleEffect() {
    const rippleButtons = $$('[data-ripple]');
    if (!rippleButtons.length) return;

    rippleButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement('span');

        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
      });
    });
  }

  /* ---------------------------------------------------------- */
  /* 13. GALLERY LIGHTBOX (zoom-to-view)                           */
  /* ---------------------------------------------------------- */
  function initGalleryLightbox() {
    const items = $$('.gallery-item');
    const lightbox = $('#lightbox');
    const lightboxImg = $('#lightboxImg');
    const closeBtn = $('#lightboxClose');
    if (!items.length || !lightbox || !lightboxImg) return;

    function open(src, alt) {
      lightboxImg.src = src;
      lightboxImg.alt = alt;
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    items.forEach((item) => {
      const img = $('img', item);
      if (!img) return;
      item.addEventListener('click', () => open(img.src, img.alt));
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) close();
    });
  }

  /* ---------------------------------------------------------- */
  /* 14. SCROLL-TO-TOP BUTTON                                       */
  /* ---------------------------------------------------------- */
  function initScrollToTop() {
    const btn = $('#scrollTop');
    if (!btn) return;

    function toggleVisibility() {
      btn.classList.toggle('visible', window.scrollY > 600);
    }

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });

    toggleVisibility();
    window.addEventListener('scroll', toggleVisibility, { passive: true });
  }

  /* ---------------------------------------------------------- */
  /* 15. FLOATING PARTICLES — Canvas API                           */
  /*     Lightweight particle field used in the hero and finale.  */
  /* ---------------------------------------------------------- */
  function createParticleField(canvasId, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config = {
      count: options.count || 55,
      color: options.color || '212, 175, 55', // RGB for gold, alpha applied per-particle
      maxSize: options.maxSize || 2.4,
      speed: options.speed || 0.25,
    };

    let width, height, particles;
    let animationId;

    function resize() {
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    function createParticles() {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      particles = Array.from({ length: config.count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * config.maxSize + 0.6,
        speedY: (Math.random() * config.speed + 0.05) * (Math.random() > 0.5 ? 1 : -1),
        speedX: (Math.random() - 0.5) * config.speed * 0.6,
        alpha: Math.random() * 0.5 + 0.15,
        drift: Math.random() * Math.PI * 2,
      }));
    }

    function draw() {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.drift) * 0.15;
        p.drift += 0.01;

        // Wrap particles around the edges for a continuous field.
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${config.color}, ${p.alpha})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(draw);
    }

    function init() {
      resize();
      createParticles();
      if (!prefersReducedMotion) {
        draw();
      } else {
        // Render a single static frame for reduced-motion users.
        particles.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${config.color}, ${p.alpha})`;
          ctx.fill();
        });
      }
    }

    init();

    window.addEventListener(
      'resize',
      debounce(() => {
        cancelAnimationFrame(animationId);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        resize();
        createParticles();
        if (!prefersReducedMotion) draw();
      }, 200)
    );

    // Pause the animation when the tab is hidden to save battery/CPU.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else if (!prefersReducedMotion) {
        draw();
      }
    });
  }

  function initParticles() {
    createParticleField('particleCanvas', { count: 60, speed: 0.3, maxSize: 2.2 });
    createParticleField('finaleCanvas', { count: 40, speed: 0.2, maxSize: 2.6 });
  }

  /* ---------------------------------------------------------- */
  /* 16. FOOTER YEAR                                                */
  /* ---------------------------------------------------------- */
  function initFooterYear() {
    const el = $('#footerYear');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------------------------------------------------------- */
  /* 17. SMOOTH ANCHOR SCROLL (fallback for browsers ignoring      */
  /*     CSS scroll-behavior, and to close mobile nav on click)   */
  /* ---------------------------------------------------------- */
  function initSmoothAnchors() {
    $$('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const id = anchor.getAttribute('href');
        if (!id || id === '#') return;
        const target = $(id);
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  /* ---------------------------------------------------------- */
  /* INIT — run everything once DOM is ready                       */
  /* ---------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initLoader(); // also triggers playHeroEntrance() + typing effect when done
    initCustomCursor();
    initScrollProgress();
    initNavbar();
    initActiveNavHighlight();
    initScrollReveals();
    initCountUp();
    initTimelineFill();
    initParallax();
    initTiltEffect();
    initRippleEffect();
    initGalleryLightbox();
    initScrollToTop();
    initParticles();
    initFooterYear();
    initSmoothAnchors();
  });
})();