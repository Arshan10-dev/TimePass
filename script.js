/* =========================================================================
   EQUUS — script.js
   Pure vanilla JS. No dependencies, no build step.
   ========================================================================= */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ======================================================================
     0. UTILITIES
     ====================================================================== */
  function throttleRAF(fn) {
    var ticking = false;
    return function () {
      var args = arguments, ctx = this;
      if (!ticking) {
        window.requestAnimationFrame(function () {
          fn.apply(ctx, args);
          ticking = false;
        });
        ticking = true;
      }
    };
  }

  function onReady(cb) {
    if (document.readyState !== 'loading') cb();
    else document.addEventListener('DOMContentLoaded', cb);
  }

  /* ======================================================================
     1. SCROLL PROGRESS BAR (mane-line signature element)
     ====================================================================== */
  function initScrollProgress() {
    var fill = document.querySelector('.progress-mane-fill');
    if (!fill) return;
    var length = 3400; // approx path length used for dasharray
    fill.style.strokeDasharray = length;

    function update() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      fill.style.strokeDashoffset = length - length * pct;
    }
    window.addEventListener('scroll', throttleRAF(update), { passive: true });
    update();
  }

  /* ======================================================================
     2. NAVBAR — sticky style change, active link highlight, mobile toggle
     ====================================================================== */
  function initNavbar() {
    var navbar = document.getElementById('navbar');
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');
    var navAnchors = document.querySelectorAll('[data-nav]');

    function onScroll() {
      if (window.pageYOffset > 60) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    }
    window.addEventListener('scroll', throttleRAF(onScroll), { passive: true });
    onScroll();

    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Active section highlight via IntersectionObserver
    var sections = [];
    navAnchors.forEach(function (a) {
      var id = a.getAttribute('href');
      var sec = document.querySelector(id);
      if (sec) sections.push({ id: id, el: sec, link: a });
    });

    if ('IntersectionObserver' in window && sections.length) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var match = sections.find(function (s) { return s.el === entry.target; });
          if (!match) return;
          if (entry.isIntersecting) {
            navAnchors.forEach(function (a) { a.classList.remove('active'); });
            match.link.classList.add('active');
          }
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      sections.forEach(function (s) { obs.observe(s.el); });
    }
  }

  /* ======================================================================
     3. HERO — typing / letter-reveal title + scroll indicator click
     ====================================================================== */
  function initHeroTitle() {
    var el = document.getElementById('heroTitle');
    if (!el) return;
    var text = el.getAttribute('aria-label') || el.textContent;
    el.textContent = '';

    var frag = document.createDocumentFragment();
    var i = 0;
    // Split into words first so a line break can only happen between words,
    // never inside one, while each letter still animates individually.
    var words = text.split(' ');
    words.forEach(function (word, wIndex) {
      var wordSpan = document.createElement('span');
      wordSpan.className = 'word';
      word.split('').forEach(function (ch) {
        var span = document.createElement('span');
        span.className = 'char';
        span.textContent = ch;
        if (!reduceMotion) {
          span.style.animationDelay = (0.15 + i * 0.035) + 's';
        } else {
          span.style.opacity = '1';
          span.style.transform = 'none';
        }
        wordSpan.appendChild(span);
        i++;
      });
      frag.appendChild(wordSpan);
      if (wIndex < words.length - 1) {
        var space = document.createElement('span');
        space.className = 'char space';
        space.textContent = '\u00A0';
        if (!reduceMotion) {
          space.style.animationDelay = (0.15 + i * 0.035) + 's';
        } else {
          space.style.opacity = '1';
          space.style.transform = 'none';
        }
        frag.appendChild(space);
        i++;
      }
    });
    el.appendChild(frag);
  }

  function initScrollIndicator() {
    var btn = document.getElementById('scrollIndicator');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var target = document.getElementById('freedom');
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ======================================================================
     4. SCROLL REVEAL SYSTEM — fade-up / fade-left / fade-right / zoom / blur
     ====================================================================== */
  function initScrollReveal() {
    var targets = document.querySelectorAll('[class*="reveal-"]');
    if (!targets.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (t) { t.classList.add('in-view'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
          setTimeout(function () { el.classList.add('in-view'); }, delay);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    targets.forEach(function (t) { io.observe(t); });
  }

  /* ======================================================================
     5. PARALLAX — freedom section background image
     ====================================================================== */
  function initParallax() {
    var el = document.getElementById('freedomParallax');
    if (!el || reduceMotion) return;
    var section = document.getElementById('freedom');

    function update() {
      var rect = section.getBoundingClientRect();
      var vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) return;
      var progress = (vh - rect.top) / (vh + rect.height); // 0 -> 1
      var offset = (progress - 0.5) * 90; // px range
      el.style.transform = 'translateY(' + offset.toFixed(1) + 'px)';
    }
    window.addEventListener('scroll', throttleRAF(update), { passive: true });
    window.addEventListener('resize', throttleRAF(update));
    update();
  }

  /* ======================================================================
     6. MOUSE GLOW
     ====================================================================== */
  function initMouseGlow() {
    var glow = document.querySelector('.mouse-glow');
    if (!glow || window.matchMedia('(max-width: 768px)').matches) return;
    var raf = null, x = 0, y = 0;

    window.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(function () {
          glow.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%)';
          raf = null;
        });
      }
    }, { passive: true });
  }

  /* ======================================================================
     7. FLOATING PARTICLES (ambient dust motes)
     ====================================================================== */
  function initParticles() {
    var container = document.getElementById('particles');
    if (!container || reduceMotion) return;
    var count = window.matchMedia('(max-width: 768px)').matches ? 12 : 26;

    for (var i = 0; i < count; i++) {
      var p = document.createElement('span');
      p.className = 'particle';
      var size = (Math.random() * 2.5 + 1.5).toFixed(1);
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
      var duration = (Math.random() * 14 + 14).toFixed(1);
      p.style.animationDuration = duration + 's';
      p.style.animationDelay = (Math.random() * duration).toFixed(1) + 's';
      container.appendChild(p);
    }
  }

  /* ======================================================================
     8. IMAGE TILT — breed cards react to cursor position
     ====================================================================== */
  function initImageTilt() {
    if (reduceMotion || window.matchMedia('(pointer: coarse)').matches) return;
    var cards = document.querySelectorAll('.breed-card');

    cards.forEach(function (card) {
      var bounds;
      card.addEventListener('mouseenter', function () {
        bounds = card.getBoundingClientRect();
      });
      card.addEventListener('mousemove', function (e) {
        if (!bounds) bounds = card.getBoundingClientRect();
        var px = (e.clientX - bounds.left) / bounds.width - 0.5;
        var py = (e.clientY - bounds.top) / bounds.height - 0.5;
        var rotX = (py * -6).toFixed(2);
        var rotY = (px * 8).toFixed(2);
        card.style.transform = 'translateY(-10px) perspective(900px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* ======================================================================
     9. RIPPLE EFFECT — buttons
     ====================================================================== */
  function initRipple() {
    var selectors = '.scroll-indicator, .scroll-top, .lightbox-close';
    document.querySelectorAll(selectors).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var rect = btn.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height) * 1.6;
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = ((e.clientX || rect.width / 2) - rect.left - size / 2) + 'px';
        ripple.style.top = ((e.clientY || rect.height / 2) - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        setTimeout(function () { ripple.remove(); }, 750);
      });
    });
  }

  /* ======================================================================
     10. GALLERY LIGHTBOX
     ====================================================================== */
  function initLightbox() {
    var items = document.querySelectorAll('.masonry-item');
    var lightbox = document.getElementById('lightbox');
    var lightboxImg = document.getElementById('lightboxImg');
    var closeBtn = document.getElementById('lightboxClose');
    if (!lightbox || !items.length) return;

    function open(src, alt) {
      lightboxImg.src = src;
      lightboxImg.alt = alt || '';
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }

    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var full = item.getAttribute('data-full');
        var img = item.querySelector('img');
        open(full || (img && img.src), img && img.alt);
      });
    });

    closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  /* ======================================================================
     11. AUTO-CHANGING QUOTES
     ====================================================================== */
  function initQuotes() {
    var textEl = document.getElementById('quoteText');
    var authorEl = document.getElementById('quoteAuthor');
    var dotsEl = document.getElementById('quoteDots');
    if (!textEl) return;

    var quotes = [
      { text: 'There is something about the outside of a horse that is good for the inside of a man.', author: 'Winston Churchill' },
      { text: 'A horse gallops with his lungs, perseveres with his heart, and wins with his character.', author: 'Federico Tesio' },
      { text: 'The wind of heaven is that which blows between a horse\u2019s ears.', author: 'Arabian Proverb' },
      { text: 'No hour of life is wasted that is spent in the saddle.', author: 'Winston Churchill' },
      { text: 'In riding a horse, we borrow freedom.', author: 'Helen Thomson' },
      { text: 'Horses lend us the wings we lack.', author: 'Pam Brown' }
    ];

    var index = 0;
    var timer = null;

    quotes.forEach(function (_, i) {
      var dot = document.createElement('span');
      dot.className = 'quote-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', function () { show(i, true); });
      dotsEl.appendChild(dot);
    });

    function show(i, userTriggered) {
      index = i;
      textEl.classList.add('quote-fade-out');
      authorEl.classList.add('quote-fade-out');
      setTimeout(function () {
        textEl.textContent = quotes[index].text;
        authorEl.textContent = '\u2014 ' + quotes[index].author;
        textEl.classList.remove('quote-fade-out');
        authorEl.classList.remove('quote-fade-out');
        dotsEl.querySelectorAll('.quote-dot').forEach(function (d, di) {
          d.classList.toggle('active', di === index);
        });
      }, reduceMotion ? 0 : 350);

      if (userTriggered) restart();
    }

    function next() {
      show((index + 1) % quotes.length);
    }

    function restart() {
      if (timer) clearInterval(timer);
      if (!reduceMotion) timer = setInterval(next, 5500);
    }

    show(0);
    restart();
  }

  /* ======================================================================
     12. COUNT-UP FUN FACTS
     ====================================================================== */
  function initCountUp() {
    var cards = document.querySelectorAll('.fact-number');
    if (!cards.length) return;

    function animateCount(el) {
      var target = parseFloat(el.getAttribute('data-target'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      var duration = 1600;
      var startTime = null;

      if (reduceMotion) {
        el.textContent = target + suffix;
        return;
      }

      function step(ts) {
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
        var current = Math.floor(eased * target);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target + suffix;
      }
      requestAnimationFrame(step);
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      cards.forEach(function (c) { io.observe(c); });
    } else {
      cards.forEach(animateCount);
    }
  }

  /* ======================================================================
     13. ENDING — blur reveal
     ====================================================================== */
  function initEndingReveal() {
    var el = document.getElementById('endingContent');
    if (!el) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      el.classList.add('in-view');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          el.classList.add('in-view');
          io.unobserve(el);
        }
      });
    }, { threshold: 0.35 });
    io.observe(el);
  }

  /* ======================================================================
     14. SCROLL TO TOP BUTTON
     ====================================================================== */
  function initScrollTop() {
    var btn = document.getElementById('scrollTop');
    if (!btn) return;

    function onScroll() {
      if (window.pageYOffset > window.innerHeight * 0.8) btn.classList.add('visible');
      else btn.classList.remove('visible');
    }
    window.addEventListener('scroll', throttleRAF(onScroll), { passive: true });
    onScroll();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ======================================================================
     15. VIDEO FALLBACK — if hero video fails entirely, fall back to the
     poster image (set as a CSS background so it still covers the frame
     even if the <video> box itself is hidden), then to the gradient alone.
     ====================================================================== */
  function initVideoFallback() {
    var video = document.getElementById('heroVideo');
    var media = document.querySelector('.hero-media');
    if (!video) return;

    function fallback() {
      video.style.display = 'none';
      // Promote the poster to a full-bleed CSS background on the wrapper so
      // the hero still shows an image instead of the bare gradient, and so a
      // slow-loading poster doesn't leave Chromium's opaque broken-video box
      // visible in the meantime.
      var poster = video.getAttribute('poster');
      if (poster && media) {
        media.style.backgroundImage =
          'linear-gradient(180deg, rgba(7,7,10,0.15), rgba(7,7,10,0.5)), url("' + poster + '")';
        media.style.backgroundSize = 'cover';
        media.style.backgroundPosition = 'center';
      }
    }

    // Fires on the <video> element itself and, via capture, bubbles up from
    // any failed <source> child too — so a single dead source doesn't wait
    // for a generic timeout.
    video.addEventListener('error', fallback, true);

    // Safety net: if nothing has started loading shortly after mount (slow
    // network, blocked domain, etc.), fail gracefully rather than leave an
    // empty/broken frame for several seconds.
    setTimeout(function () {
      if (video.readyState === 0) fallback();
    }, 2500);
  }

  /* ======================================================================
     INIT
     ====================================================================== */
  onReady(function () {
    initScrollProgress();
    initNavbar();
    initHeroTitle();
    initScrollIndicator();
    initScrollReveal();
    initParallax();
    initMouseGlow();
    initParticles();
    initImageTilt();
    initRipple();
    initLightbox();
    initQuotes();
    initCountUp();
    initEndingReveal();
    initScrollTop();
    initVideoFallback();
  });

})();