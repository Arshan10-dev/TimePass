(() => {
  "use strict";

  /* ============================================
     Tiny sound synth (no external audio files)
  ============================================ */
  let audioCtx = null;
  function getCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  }

  function playTone(freqStart, freqEnd, duration, type = "sine", volume = 0.06) {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(freqEnd, 1),
      ctx.currentTime + duration
    );
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function playWhoosh() {
    playTone(700, 180, 0.28, "sine", 0.05);
  }

  function playLaugh() {
    // playful little descending giggle made of quick blips
    const ctx = getCtx();
    if (!ctx) return;
    [520, 460, 600, 400].forEach((f, i) => {
      setTimeout(() => playTone(f, f * 0.8, 0.14, "triangle", 0.05), i * 90);
    });
  }

  /* ============================================
     Custom cursor
  ============================================ */
  const cursorDot = document.getElementById("cursorDot");
  const cursorRing = document.getElementById("cursorRing");
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  if (!isTouch) {
    let ringX = window.innerWidth / 2;
    let ringY = window.innerHeight / 2;
    let targetX = ringX;
    let targetY = ringY;

    window.addEventListener("mousemove", (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      cursorDot.style.left = e.clientX + "px";
      cursorDot.style.top = e.clientY + "px";
    });

    window.addEventListener("mousedown", () => cursorRing.classList.add("active"));
    window.addEventListener("mouseup", () => cursorRing.classList.remove("active"));

    function animateRing() {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      cursorRing.style.left = ringX + "px";
      cursorRing.style.top = ringY + "px";
      requestAnimationFrame(animateRing);
    }
    animateRing();
  }

  /* ============================================
     Background bubbles
  ============================================ */
  const bubbleField = document.getElementById("bubbles");
  const BUBBLE_COUNT = 16;

  for (let i = 0; i < BUBBLE_COUNT; i++) {
    const b = document.createElement("div");
    b.className = "bubble";
    const size = 14 + Math.random() * 46;
    b.style.width = size + "px";
    b.style.height = size + "px";
    b.style.left = Math.random() * 100 + "vw";
    const duration = 9 + Math.random() * 10;
    b.style.animationDuration = duration + "s";
    b.style.animationDelay = -(Math.random() * duration) + "s";
    bubbleField.appendChild(b);
  }

  /* ============================================
     Floating background emojis
  ============================================ */
  const emojiField = document.getElementById("emojiField");
  const EMOJIS = ["😂", "🥹", "😍", "✨", "💖", "😎", "🤣", "😉", "🌟", "😊"];
  const EMOJI_COUNT = 14;

  for (let i = 0; i < EMOJI_COUNT; i++) {
    const el = document.createElement("div");
    el.className = "floating-emoji";
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    el.style.left = Math.random() * 100 + "vw";
    el.style.fontSize = 1.2 + Math.random() * 1.6 + "rem";
    const duration = 10 + Math.random() * 12;
    el.style.animationDuration = duration + "s";
    el.style.animationDelay = -(Math.random() * duration) + "s";
    emojiField.appendChild(el);
  }

  /* ============================================
     YES button — the runaway button
  ============================================ */
  const yesBtn = document.getElementById("yesBtn");
  const card = document.getElementById("card");
  const hint = document.getElementById("hint");

  const dodgeLines = [
    "nice try 😌",
    "not today! 💨",
    "catch me if you can 🏃",
    "nope nope nope 😂",
    "so close! (not really)",
    "keep trying 👀",
    "the truth hurts 😆",
  ];

  let dodgeCount = 0;

  function getButtonSize() {
    const rect = yesBtn.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  function moveYesButton() {
    // measure BEFORE any position change, so width/height are accurate
    const rect = yesBtn.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (!yesBtn.classList.contains("runaway")) {
      // freeze current position first so the transition starts from here
      yesBtn.style.width = w + "px";
      yesBtn.style.height = h + "px";
      yesBtn.style.left = rect.left + "px";
      yesBtn.style.top = rect.top + "px";
      yesBtn.style.right = "auto";
      yesBtn.style.bottom = "auto";
      yesBtn.classList.add("runaway");
      // force reflow so the browser registers the starting point before we move it
      void yesBtn.offsetWidth;
    }

    const margin = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const maxLeft = Math.max(margin, vw - w - margin);
    const maxTop = Math.max(margin, vh - h - margin);

    const newLeft = Math.min(maxLeft, margin + Math.random() * (maxLeft - margin));
    const newTop = Math.min(maxTop, margin + Math.random() * (maxTop - margin));

    yesBtn.style.left = newLeft + "px";
    yesBtn.style.top = newTop + "px";

    yesBtn.classList.remove("whoosh");
    void yesBtn.offsetWidth;
    yesBtn.classList.add("whoosh");

    playWhoosh();

    dodgeCount++;
    if (dodgeCount % 2 === 0) {
      hint.textContent = dodgeLines[Math.floor(Math.random() * dodgeLines.length)];
    }
  }

  // Desktop: dodge the moment the cursor gets close
  yesBtn.addEventListener("mouseenter", (e) => {
    if (isTouch) return;
    moveYesButton();
  });

  // Fallback / mobile: dodge on the attempted tap itself, never register a "yes"
  yesBtn.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      moveYesButton();
    },
    { passive: false }
  );

  yesBtn.addEventListener("click", (e) => {
    e.preventDefault();
    moveYesButton();
  });

  // keep the button inside the viewport if the window is resized
  window.addEventListener("resize", () => {
    if (!yesBtn.classList.contains("runaway")) return;
    const rect = yesBtn.getBoundingClientRect();
    const margin = 16;
    const clampedLeft = Math.min(rect.left, window.innerWidth - rect.width - margin);
    const clampedTop = Math.min(rect.top, window.innerHeight - rect.height - margin);
    yesBtn.style.left = Math.max(margin, clampedLeft) + "px";
    yesBtn.style.top = Math.max(margin, clampedTop) + "px";
  });

  /* ============================================
     NO button — the honest one
  ============================================ */
  const noBtn = document.getElementById("noBtn");
  const question = document.getElementById("question");
  const subtext = document.getElementById("subtext");

  noBtn.addEventListener("click", () => {
    question.textContent = "😂 Hahahaa... I know!";
    subtext.textContent = "at least you're honest";
    card.classList.add("answered");
    playLaugh();
    launchConfetti();
  });

  /* ============================================
     Confetti
  ============================================ */
  const canvas = document.getElementById("confettiCanvas");
  const ctx2d = canvas.getContext("2d");
  let confettiPieces = [];
  let confettiRunning = false;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  const CONFETTI_COLORS = ["#ff6ec4", "#7873f5", "#4adede", "#ffd76e", "#34e89e", "#ff5f6d"];

  function launchConfetti() {
    const pieceCount = 140;
    for (let i = 0; i < pieceCount; i++) {
      confettiPieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.5,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        speedY: 2 + Math.random() * 3.5,
        speedX: (Math.random() - 0.5) * 2.4,
        life: 0,
        maxLife: 260 + Math.random() * 80,
      });
    }
    if (!confettiRunning) {
      confettiRunning = true;
      requestAnimationFrame(updateConfetti);
    }
  }

  function updateConfetti() {
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);

    confettiPieces.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(p.y * 0.02) * 0.6;
      p.rotation += p.rotationSpeed;
      p.life++;

      ctx2d.save();
      ctx2d.translate(p.x, p.y);
      ctx2d.rotate((p.rotation * Math.PI) / 180);
      ctx2d.fillStyle = p.color;
      ctx2d.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx2d.restore();
    });

    confettiPieces = confettiPieces.filter(
      (p) => p.life < p.maxLife && p.y < canvas.height + 40
    );

    if (confettiPieces.length > 0) {
      requestAnimationFrame(updateConfetti);
    } else {
      confettiRunning = false;
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
})();