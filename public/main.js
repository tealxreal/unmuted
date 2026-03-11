(() => {
  const home = document.getElementById("home-view");
  if (!home) return;

  const lines = home.querySelectorAll(".line");

  function resetHomeLines(){
    // 把動畫確實重置到初始狀態（避免回來時卡在中途）
    lines.forEach(el => {
      el.style.animation = "none";   // 關掉
      // 強制 reflow，讓瀏覽器吃到「動畫被關掉」這個狀態
      void el.offsetHeight;
      el.style.animation = "";       // 交回給 CSS 控制
    });
  }

  let isActive = false;

  const io = new IntersectionObserver((entries) => {
    const e = entries[0];
    const nowActive = e.isIntersecting && e.intersectionRatio >= 0.55; // 超過一半才算

    if (nowActive === isActive) return;
    isActive = nowActive;

    if (nowActive) {
      home.classList.add("is-active");
      // 進入時也重置一次，確保從頭開始
      resetHomeLines();
    } else {
      home.classList.remove("is-active");
      resetHomeLines();
    }
  }, { threshold: [0, 0.25, 0.55, 0.75, 1] });

  io.observe(home);
})();
const emotionButtons = document.querySelectorAll(".emotion-btn");
const previewAudio = new Audio(); // 試聽專用播放器

emotionButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const emotion = btn.dataset.emotion;

        // 這裡改成你的實際音檔路徑
        previewAudio.src = `/audio/${emotion}.mp3`;

        previewAudio.currentTime = 0;
        previewAudio.play();
        syncTapHint();
    });
});


/* =========================
   試玩區 - 輸入與生成
========================= */

const textarea = document.getElementById("user-input");
const generateBtn = document.getElementById("generate-btn");
const playBtn = document.getElementById("play-btn");

let generatedAudioURL = null;
let generatedAudio = new Audio();
playBtn.disabled = true;

/* --- 3️⃣ 點擊確認送出 --- */
generateBtn.addEventListener("click", () => {
    generateMusic();
});
/* ✅ 如果文字改了：舊音檔作廢，播放鍵回到灰 */
textarea.addEventListener("input", () => {
  generatedAudioURL = null;
  playBtn.disabled = true;
  playBtn.textContent = "播放音樂";
});

/* --- 4️⃣ 呼叫後端生成音樂 --- */

async function generateMusic() {
    const text = textarea.value.trim();
    if (!text) return;
    generateBtn.disabled = true;
    generateBtn.textContent = "生成中...";
    playBtn.disabled = true;
    try {
        const API_BASE = "https://unmuted.onrender.com";
        const response = await fetch(`${API_BASE}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sentence: text })
        });

        if (!response.ok) throw new Error("生成失敗");

        const blob = await response.blob();
        generatedAudioURL = URL.createObjectURL(blob);
        generatedAudio.src = generatedAudioURL;

        // 顯示播放鍵
        playBtn.classList.add("visible-btn");
        playBtn.classList.remove("hidden-btn");
        playBtn.disabled = false;

    } catch (err) {
        alert("生成失敗，請再試一次");
        playBtn.disabled = true;
    }

    generateBtn.disabled = false;
    generateBtn.textContent = "確認送出";
}


/* --- 5️⃣ 播放生成音樂 --- */

playBtn.addEventListener("click", () => {
    if (!generatedAudioURL) return;
    if (playBtn.disabled) return;
    generatedAudio.currentTime = 0;
    generatedAudio.play();
});


/* =========================
   切頁時停止播放
========================= */

function stopAllAudio() {
    // 試聽音
  if (!previewAudio.paused) {
    previewAudio.pause();
    previewAudio.currentTime = 0;
  }
  // 生成音
  if (!generatedAudio.paused) {
    generatedAudio.pause();
    generatedAudio.currentTime = 0;
  }
}

(() => {
  const pages = document.querySelectorAll(".page");
  const container = document.querySelector(".container");
  if (!pages.length || !container) return;
  let currentPageId = null;
  // 觀察每一頁，哪一頁進入「主要可見」就算切頁
  const io = new IntersectionObserver((entries) => {
    // 找到目前可見比例最高的那一頁
    let best = null;
    for (const e of entries) {
      if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
    }
    if (!best) return;
    // 你想「超過一半才算切頁」→ 0.6 很穩（你可改 0.55 / 0.7）
    if (best.intersectionRatio < 0.65) return;
    const newId = best.target.id || null;
    if (!newId) return;

    // 真正換頁才停
    if (currentPageId && newId !== currentPageId) {
      stopAllAudio();
    }
    currentPageId = newId;
  }, {
    root: container,
    threshold: [0.2, 0.5, 0.8]
  });

  pages.forEach(p => io.observe(p));

  pages.forEach(p => io.observe(p));
  currentPageId = pages[0].id || null;
})();

(function bgScroller(){
  const track = document.getElementById("bgTrack");
  if (!track) return;

  const slideH = () => window.innerHeight;
  let y = 0;
  let last = performance.now();

  const baseSpeed = 15;
  const fastSpeed = 200;
  const accelAt = 0.15;

  let paused = false;
  let scrollTimer = null;

  function tick(now){
    const dt = (now - last) / 1000;
    last = now;

    if (!paused){
      const h = slideH();
      const progress = (y % h) / h;
      const speed = progress < accelAt ? baseSpeed : fastSpeed;
      y += speed * dt;

      const loopH = h * (track.children.length / 2);
      if (y >= loopH) y -= loopH;

      track.style.transform = `translate3d(0, ${-y}px, 0)`;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // ✅ 捲動時暫停背景動畫，提升順暢度
  const scroller = document.scrollingElement || document.documentElement;
  scroller.addEventListener("scroll", () => {
    paused = true;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { paused = false; }, 120);
  }, { passive: true });

  window.addEventListener("resize", () => {
    const h = slideH();
    const loopH = h * (track.children.length / 2);
    y = y % loopH;
  });
})();
/* =========================
   播放狀態 UI（中央提示 + 可點空白暫停）
========================= */
const tapHint = document.getElementById("tap-to-pause");
function showTapHint(show){
  if (!tapHint) return;
  tapHint.classList.toggle("is-hidden", !show);
}
function isAnyAudioPlaying(){
  return (!previewAudio.paused) || (!generatedAudio.paused);
}
function syncTapHint(){
  showTapHint(isAnyAudioPlaying());
}
// ✅ 只要「開始播放」就顯示（play 就夠用了，playing 當加強）
["play","playing","pause","ended"].forEach(evt => {
  previewAudio.addEventListener(evt, syncTapHint);
  generatedAudio.addEventListener(evt, syncTapHint);
});
// ✅ 強制：任何音樂開始播放時，立刻顯示（雙保險）
function forceShowOnStart(audio){
  const onStart = () => showTapHint(true);
  audio.addEventListener("play", onStart);
  audio.addEventListener("playing", onStart);
}
forceShowOnStart(previewAudio);
forceShowOnStart(generatedAudio);
// ✅ 任意點一下畫面就暫停（用 pointerdown 比 click 更穩，iPad 也吃）
document.addEventListener("pointerdown", () => {
  if (!isAnyAudioPlaying()) return;
  stopAllAudio();
  showTapHint(false);
}, { passive: true });
// ✅ 保險：如果你用 stopAllAudio() 在別處停了，也同步關提示
const _stopAllAudio = stopAllAudio;
stopAllAudio = function(){
  _stopAllAudio();
  showTapHint(false);
};
//滾動音符
(() => {
  const orb = document.getElementById("scroll-orb");
  const container = document.querySelector(".container");
  if (!orb || !container) return;
  const margin = 20;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  let ticking = false;
  function update() {
    ticking = false;
    const scrollTop = container.scrollTop;
    const scrollMax = Math.max(0, container.scrollHeight - container.clientHeight);
    const t = scrollMax ? clamp(scrollTop / scrollMax, 0, 1) : 0;

    const orbH = orb.getBoundingClientRect().height || 44;
    const yRange = container.clientHeight - margin * 2 - orbH;
    const y = Math.max(0, yRange * t);
    const rot = 360 * 4 * t;

    orb.style.transform = `translate3d(0, ${y}px, 0) rotate(${rot}deg)`;
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }
  container.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(update));
  window.addEventListener("load", update);
  // --- Debug：你可以先留著，看是不是有在跑 ---
  let n = 0;
  function debugOncePerSecond() {
    n++;
    if (n % 60 === 0) {
      console.log("[orb]", {
        scrollTop: scroller.scrollTop,
        scrollMax: scroller.scrollHeight - window.innerHeight,
        transform: orb.style.transform
      });
    }
    requestAnimationFrame(debugOncePerSecond);
  }
  requestAnimationFrame(debugOncePerSecond);

  update();
})();

const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const lerp = (a,b,t)=>a+(b-a)*t;
/* 取得 section 進場程度 */
function pageProgress(section){
  const r = section.getBoundingClientRect();
  const vh = window.innerHeight;
  const center = r.top + r.height/2;
  const viewportCenter = vh/2;
  const dist = Math.abs(center - viewportCenter);
  const range = vh * 0.9;
  return clamp(1 - dist / range, 0, 1);
}
/* 記錄元素初始 offset */
const fxElements = [];
document.querySelectorAll(".fx, .fx06, .fx08, .fx1206").forEach(el=>{
  const style = getComputedStyle(el);
  const x = parseFloat(style.getPropertyValue("--fx-x")) || 0;
  const y = parseFloat(style.getPropertyValue("--fx-y")) || 0;
  fxElements.push({
    el,
    startX: x,
    startY: y
  });
});
/* 更新動畫 */
function updateFX(){
  document.querySelectorAll(".page").forEach(section=>{
    const p = pageProgress(section);
    section.querySelectorAll(".fx, .fx06, .fx08, .fx1206").forEach(el=>{
      const data = fxElements.find(d => d.el === el);
      if(!data) return;
      const x = lerp(data.startX,0,p);
      const y = lerp(data.startY,0,p);
      el.style.setProperty("--fx-x", x+"px");
      el.style.setProperty("--fx-y", y+"px");
      el.style.setProperty("--fx-o", p);
    });
  });
}
/* Scroll 驅動 */
let raf = null;
function onScroll(){
  if(raf) return;
  raf = requestAnimationFrame(()=>{
    updateFX();
    raf = null;
  });
}
document.querySelector(".container").addEventListener("scroll", onScroll,{passive:true})
window.addEventListener("resize",updateFX);
updateFX();
//清除
const clearBtn = document.getElementById("clear-btn");
clearBtn.addEventListener("click", () => {
    textarea.value = "";
    playBtn.classList.add("hidden-btn");
    playBtn.classList.remove("visible-btn");
    playBtn.disabled = true;
    counter.textContent = textarea.value.length;
});
//計算字數
const counter = document.getElementById("char-count");
if (textarea && counter) {
  textarea.addEventListener("input", () => {
    counter.textContent = textarea.value.length;
  });
}