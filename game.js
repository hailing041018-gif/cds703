(function () {
  const L = {
    pageTitle: "\u732b\u6293\u8001\u9f20",
    title: "\u732b\u6293\u8001\u9f20",
    score: "\u5f97\u5206\uff1a",
    time: "\u65f6\u95f4\uff1a",
    hint: "\u65b9\u5411\u952e\u6216 WASD \u79fb\u52a8\u732b\u5450\uff0c\u78b0\u5230\u8001\u9f20\u5f97\u5206\u3002\u8001\u9f20\u4f1a\u9003\u8dd1\uff01",
    introTitle: "\u732b\u6293\u8001\u9f20",
    introMsg: "\u5728 60 \u79d2\u5185\u5c3d\u53ef\u80fd\u591a\u6293\u5230\u8001\u9f20\uff01",
    start: "\u5f00\u59cb\u6e38\u620f",
    timeUp: "\u65f6\u95f4\u5230\uff01",
    finalScore: (n) => `\u6700\u7ec8\u5f97\u5206\uff1a${n}\u3002\u518d\u8bd5\u4e00\u6b21\u6311\u6218\u66f4\u9ad8\u5206\u5427\uff01`,
    again: "\u518d\u73a9\u4e00\u6b21",
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const timeEl = document.getElementById("time");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayMsg = document.getElementById("overlay-msg");
  const startBtn = document.getElementById("start-btn");

  document.title = L.pageTitle;
  document.getElementById("title").textContent = L.title;
  document.getElementById("label-score").textContent = L.score;
  document.getElementById("label-time").textContent = L.time;
  document.getElementById("hint").textContent = L.hint;
  overlayTitle.textContent = L.introTitle;
  overlayMsg.textContent = L.introMsg;
  startBtn.textContent = L.start;

  const W = canvas.width;
  const H = canvas.height;

  const keys = {};
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  const walls = [
    { x: 120, y: 80, w: 200, h: 24 },
    { x: 480, y: 80, w: 200, h: 24 },
    { x: 300, y: 200, w: 200, h: 24 },
    { x: 80, y: 320, w: 180, h: 24 },
    { x: 540, y: 320, w: 180, h: 24 },
    { x: 280, y: 400, w: 240, h: 24 },
    { x: 200, y: 140, w: 24, h: 120 },
    { x: 576, y: 140, w: 24, h: 120 },
    { x: 388, y: 260, w: 24, h: 100 },
  ];

  function circleRectCollide(cx, cy, r, rect) {
    const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy < r * r;
  }

  function resolveCircleWall(x, y, r, vx, vy) {
    let nx = x + vx;
    let ny = y + vy;
    for (const wall of walls) {
      if (circleRectCollide(nx, ny, r, wall)) {
        const testX = circleRectCollide(x + vx, y, r, wall);
        const testY = circleRectCollide(x, y + vy, r, wall);
        if (testX && !testY) nx = x;
        else if (testY && !testX) ny = y;
        else {
          nx = x;
          ny = y;
        }
      }
    }
    nx = Math.max(r, Math.min(W - r, nx));
    ny = Math.max(r, Math.min(H - r, ny));
    return { x: nx, y: ny };
  }

  const cat = {
    x: 80,
    y: H - 80,
    r: 22,
    speed: 4.2,
    angle: 0,
  };

  const mouse = {
    x: W - 100,
    y: 100,
    r: 14,
    speed: 3.4,
    fleeDist: 140,
    wobble: 0,
  };

  let score = 0;
  let timeLeft = 60;
  let running = false;
  let timerInterval = null;
  let catchFlash = 0;

  function randomMousePos() {
    let tries = 0;
    while (tries++ < 80) {
      const x = 40 + Math.random() * (W - 80);
      const y = 40 + Math.random() * (H - 80);
      let ok = true;
      for (const wall of walls) {
        if (circleRectCollide(x, y, mouse.r + 4, wall)) ok = false;
      }
      const dCat = Math.hypot(x - cat.x, y - cat.y);
      if (dCat < 120) ok = false;
      if (ok) {
        mouse.x = x;
        mouse.y = y;
        return;
      }
    }
    mouse.x = W / 2;
    mouse.y = H / 2;
  }

  function updateMouse() {
    const dx = mouse.x - cat.x;
    const dy = mouse.y - cat.y;
    const dist = Math.hypot(dx, dy) || 1;
    mouse.wobble += 0.08;

    let mx = 0;
    let my = 0;
    if (dist < mouse.fleeDist) {
      mx = (dx / dist) * mouse.speed * 1.15;
      my = (dy / dist) * mouse.speed * 1.15;
    } else {
      const angle = mouse.wobble + Date.now() * 0.001;
      mx = Math.cos(angle) * mouse.speed * 0.35;
      my = Math.sin(angle * 1.3) * mouse.speed * 0.35;
    }

    const next = resolveCircleWall(mouse.x, mouse.y, mouse.r, mx, my);
    mouse.x = next.x;
    mouse.y = next.y;
  }

  function updateCat() {
    let vx = 0;
    let vy = 0;
    if (keys["ArrowLeft"] || keys["KeyA"]) vx -= cat.speed;
    if (keys["ArrowRight"] || keys["KeyD"]) vx += cat.speed;
    if (keys["ArrowUp"] || keys["KeyW"]) vy -= cat.speed;
    if (keys["ArrowDown"] || keys["KeyS"]) vy += cat.speed;
    if (vx !== 0 && vy !== 0) {
      const s = cat.speed / Math.hypot(vx, vy);
      vx *= s;
      vy *= s;
    }
    if (vx !== 0 || vy !== 0) {
      cat.angle = Math.atan2(vy, vx);
    }
    const next = resolveCircleWall(cat.x, cat.y, cat.r, vx, vy);
    cat.x = next.x;
    cat.y = next.y;
  }

  function checkCatch() {
    const d = Math.hypot(cat.x - mouse.x, cat.y - mouse.y);
    if (d < cat.r + mouse.r - 4) {
      score += 10;
      scoreEl.textContent = score;
      catchFlash = 12;
      randomMousePos();
    }
  }

  function drawFloor() {
    ctx.fillStyle = "#3d5a4c";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x <= W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  function drawWalls() {
    for (const wall of walls) {
      const g = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.h);
      g.addColorStop(0, "#6b4f3a");
      g.addColorStop(1, "#4a3528");
      ctx.fillStyle = g;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.strokeStyle = "#2a1f18";
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
    }
  }

  function drawCat() {
    ctx.save();
    ctx.translate(cat.x, cat.y);
    ctx.rotate(cat.angle);
    ctx.fillStyle = "#ff9f1c";
    ctx.beginPath();
    ctx.ellipse(0, 0, cat.r, cat.r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff9f1c";
    ctx.beginPath();
    ctx.moveTo(cat.r * 0.3, -cat.r * 0.5);
    ctx.lineTo(cat.r * 0.9, -cat.r * 0.9);
    ctx.lineTo(cat.r * 0.5, -cat.r * 0.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cat.r * 0.3, cat.r * 0.5);
    ctx.lineTo(cat.r * 0.9, cat.r * 0.9);
    ctx.lineTo(cat.r * 0.5, cat.r * 0.2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cat.r * 0.35, -cat.r * 0.15, 5, 0, Math.PI * 2);
    ctx.arc(cat.r * 0.35, cat.r * 0.15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(cat.r * 0.4, -cat.r * 0.15, 2.5, 0, Math.PI * 2);
    ctx.arc(cat.r * 0.4, cat.r * 0.15, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawMouse() {
    ctx.save();
    ctx.translate(mouse.x, mouse.y);
    const faceCat = Math.atan2(cat.y - mouse.y, cat.x - mouse.x);
    ctx.rotate(faceCat + Math.PI);
    ctx.fillStyle = "#adb5bd";
    ctx.beginPath();
    ctx.ellipse(0, 0, mouse.r, mouse.r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffb4a2";
    ctx.beginPath();
    ctx.arc(-mouse.r * 0.5, 0, mouse.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#adb5bd";
    ctx.beginPath();
    ctx.moveTo(-mouse.r * 0.8, -mouse.r * 0.6);
    ctx.lineTo(-mouse.r * 1.2, -mouse.r * 1.1);
    ctx.lineTo(-mouse.r * 0.5, -mouse.r * 0.3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-mouse.r * 0.8, mouse.r * 0.6);
    ctx.lineTo(-mouse.r * 1.2, mouse.r * 1.1);
    ctx.lineTo(-mouse.r * 0.5, mouse.r * 0.3);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(-mouse.r * 0.15, -mouse.r * 0.12, 2, 0, Math.PI * 2);
    ctx.arc(-mouse.r * 0.15, mouse.r * 0.12, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCatchFlash() {
    if (catchFlash <= 0) return;
    catchFlash--;
    ctx.fillStyle = `rgba(255, 209, 102, ${catchFlash / 24})`;
    ctx.fillRect(0, 0, W, H);
  }

  function tick(now) {
    if (!running) return;
    updateCat();
    updateMouse();
    checkCatch();

    drawFloor();
    drawWalls();
    drawMouse();
    drawCat();
    drawCatchFlash();

    requestAnimationFrame(tick);
  }

  function endGame() {
    running = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    overlay.classList.remove("hidden");
    overlayTitle.textContent = L.timeUp;
    overlayMsg.textContent = L.finalScore(score);
    startBtn.textContent = L.again;
  }

  function startGame() {
    score = 0;
    timeLeft = 60;
    scoreEl.textContent = "0";
    timeEl.textContent = "60";
    cat.x = 80;
    cat.y = H - 80;
    randomMousePos();
    catchFlash = 0;
    overlay.classList.add("hidden");
    running = true;

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!running) return;
      timeLeft--;
      timeEl.textContent = String(timeLeft);
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);

    requestAnimationFrame(tick);
  }

  startBtn.addEventListener("click", startGame);
  overlay.classList.remove("hidden");
})();
