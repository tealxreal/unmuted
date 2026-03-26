const mainPages = [
  document.getElementById("home-view"),
  document.getElementById("concept-view"),
  document.getElementById("system-view")
];
const home = document.getElementById("home-view")
const interactionPages = [
  document.getElementById("experience-view-1"),
  document.getElementById("experience-view-2"),
  document.getElementById("catalog-view")
];
const interactionintroview = document.getElementById("interaction-intro-view");
const experienceview1 = document.getElementById("experience-view-1");
const experienceview2 = document.getElementById("experience-view-2");
const catalogview = document.getElementById("catalog-view");
const mainArt = document.getElementById("mainArt");
const interactionArt = document.getElementById("interactionArt");

function fixHomeFX(){
  if(!mainPages) return;

  fxElements.forEach(item => {
    if (item.section === home) {
      item.currentP = 1;
      item.el.style.setProperty("--fx-x", "0px");
      item.el.style.setProperty("--fx-y", "0px");
      item.el.style.setProperty("--fx-o", "1");
    }
  });
}
let currentMode = "main"; // "main" 或 "interaction"
let currentMainIndex = 0;
let currentInteractionIndex = 0;
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarToggles = document.querySelectorAll(".sidebar-toggle");
const sidebarLinks = document.querySelectorAll(".sidebar-link");
const sidebarPanel = document.querySelector(".sidebar-panel");
const counter = document.getElementById("char-count");
const container = document.querySelector(".container");
const enterInteractionBtn = document.getElementById("enter-interaction-btn");
const closeInteractionBtns = document.querySelectorAll(".close-interaction-btn");
const containerEl = document.querySelector(".container");
function clamp(v, min, max){
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t){
  return a + (b - a) * t;
}
/* =========================
   試玩區 - 輸入與生成
========================= */
const textarea = document.getElementById("user-input");
const generateBtn = document.getElementById("generate-btn");
const playBtn = document.getElementById("play-btn");
const clearBtn = document.getElementById("clear-btn");
const emotionButtons = document.querySelectorAll(".emotion-btn");
const loadingOverlay = document.getElementById("loadingOverlay");
const tapHint = document.getElementById("tap-to-pause");
const scroller = document.scrollingElement || document.documentElement;
const previewAudio = new Audio();
const analysisResult = document.getElementById("analysisResult");
const nonPassiveOption = { passive: false };
let generatedAudioURL = null;
let generatedAudio = new Audio();
const viewTanzakuBtn = document.getElementById("viewTanzakuBtn");
const tanzakuPreviewWrap = document.getElementById("tanzakuPreviewWrap");
const tanzakuPreviewImg = document.getElementById("tanzakuPreviewImg");
const downloadTanzakuBtn = document.getElementById("downloadTanzakuBtn");

let currentTanzakuDataUrl = "";
let currentTanzakuEmotion = "";
let currentTanzakuTimestamp = "";
playBtn.disabled = true;
/* --- 3️⃣ 點擊確認送出 --- */
generateBtn.addEventListener("click", () => {
    generateMusic();
});
/* ✅ 如果文字改了：舊音檔作廢，播放鍵回到灰 */
textarea.addEventListener("input", () => {
  generatedAudioURL = null;
  hideAnalysisResult();
  playBtn.disabled = true;
  playBtn.textContent = "播放 ▶︎";
});
function parseTimestampFromFilename(filename) {
    const base = filename.replace(".mp3", "");
    return base.split("_")[0] || "";
}
const filename = extractFilenameFromUrl(data.audio_url);
const timestamp = parseTimestampFromFilename(filename);
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
//合成圖片
async function composeTanzakuImage({ emotion, timestamp }) {
  const config = TANZAKU_DATA[emotion];
  if (!config) throw new Error(`No tanzaku config for emotion: ${emotion}`);
  const bgSrc = pickRandom(config.backgrounds);
  const rawText = pickRandom(config.texts);
  const finalText = rawText.replaceAll("{timestamp}", timestamp);
  const bgImg = await loadImage(bgSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  // 短冊比例可再微調
  canvas.width = 900;
  canvas.height = 2500;
  // 背景
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  // 文字設定
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "20px 'Courier New', 'JetBrains Mono', 'IBM Plex Mono', monospace";

  const lines = finalText.split("\n");
  const lineHeight = 20;

  const totalTextHeight = lines.length * lineHeight;
  const startX = canvas.width / 2;
  const startY = (canvas.height - totalTextHeight) / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, startX, startY + index * lineHeight);
  });

  return canvas.toDataURL("image/png");
}
/* --- 4️⃣ 呼叫後端生成音樂 --- */
async function generateMusic() {
    const text = textarea.value.trim();
    if (!text) return;
    generateBtn.disabled = true;
    generateBtn.textContent = "生成中...";
    playBtn.disabled = true;
    try {
        showLoading();
        const API_BASE = "https://unmuted.onrender.com";
        const response = await fetch(`${API_BASE}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sentence: text })
        });

        if (!response.ok) throw new Error("生成失敗");
        hideLoading();
        //const blob = await response.blob();
        const data = await response.json();
        if (!data.audio_url) {
            throw new Error("沒有收到音檔網址");
        }
        generatedAudio.src = `${API_BASE}${data.audio_url}`;
        generatedAudio.load();

        if (data.emotion) {
            showAnalysisResult(`分析結果：${data.emotion}`);
        } else {
            hideAnalysisResult();
        }
        currentTanzakuEmotion = data.emotion || "";
        currentTanzakuTimestamp = timestamp || "";

        // 若有情緒結果，就先生成短冊圖
        if (data.emotion && timestamp) {
            currentTanzakuDataUrl = await composeTanzakuImage({
                emotion: data.emotion,
                timestamp: timestamp
            });

            tanzakuPreviewImg.src = currentTanzakuDataUrl;
            downloadTanzakuBtn.href = currentTanzakuDataUrl;
            downloadTanzakuBtn.download = `unmuted_${filename.replace(".mp3", ".png")}`;
        } else {
            currentTanzakuDataUrl = "";
        }
        // 顯示播放鍵
        playBtn.classList.add("visible-btn");
        playBtn.classList.remove("hidden-btn");
        playBtn.disabled = false;
        // 同步啟用短冊按鈕
        viewTanzakuBtn.classList.add("visible-btn");
        viewTanzakuBtn.classList.remove("hidden-btn");
        viewTanzakuBtn.disabled = !currentTanzakuDataUrl;
        hideLoading();
    } catch (err) {
        alert("生成失敗，請再試一次");
        playBtn.disabled = true;
        hideLoading();
        hideAnalysisResult();
    }
    generateBtn.disabled = false;
    generateBtn.textContent = "確認送出";
}
viewTanzakuBtn.addEventListener("click", () => {
    if (!currentTanzakuDataUrl) return;

    tanzakuPreviewImg.src = currentTanzakuDataUrl;
    tanzakuPreviewWrap.hidden = false;
});
/* --- 5️⃣ 播放生成音樂 --- */
playBtn.addEventListener("click", () => {
    if (playBtn.disabled) return;
    if (!generatedAudio.src) return;
    generatedAudio.currentTime = 0;
    generatedAudio.muted = false;
    generatedAudio.volume = 1;
    generatedAudio.play();
});
/* =========================
   切頁時停止播放
========================= */
 // 試聽專用播放器
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

function preventScrollKeys(e) {
  const keys = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "PageUp",
    "PageDown",
    "Home",
    "End",
    " ",
    "Spacebar"
  ];

  if (keys.includes(e.key)) {
    e.preventDefault();
  }
}

function preventScrollAction(e) {
  e.preventDefault();
}
function showAnalysisResult(text) {
  if (!analysisResult) return;
  analysisResult.textContent = text;
  analysisResult.classList.remove("hidden");
}
function hideAnalysisResult() {
  if (!analysisResult) return;
  analysisResult.textContent = "";
  analysisResult.classList.add("hidden");
}
(() => {
  const home = document.getElementById("home-view");
  if (!home) return;
  const mainArtStops = {
  "home-view": 0,
  "concept-view": 1/3,
  "system-view": 2/3
};

const interactionArtStops = {
  "experience-view-1": 0,
  "experience-view-2": 1/3,
  "catalog-view": 2/3
};
function updateArtPosition(pageId){
  let activeArt = null;
  let stop = 0;

  if (currentMode === "main") {
    activeArt = mainArt;
    stop = mainArtStops[pageId] ?? 0;
  } else {
    activeArt = interactionArt;
    stop = interactionArtStops[pageId] ?? 0;
  }

  if (!activeArt) return;

  const maxShift = activeArt.offsetHeight - window.innerHeight;
  const y = -maxShift * stop;

  activeArt.style.transform = `translate(-50%, ${y}px)`;
}
function updateArtGroup(){
  if (!mainArt || !interactionArt) return;

  if (currentMode === "main") {
    mainArt.classList.add("is-active");
    interactionArt.classList.remove("is-active");
  } else {
    mainArt.classList.remove("is-active");
    interactionArt.classList.add("is-active");
  }
}
function setMode(mode, targetPage = null) {
  currentMode = mode;
  const showGroup = mode === "main" ? "main" : "interaction";
  document.querySelectorAll(".page").forEach(page => {
    const group = page.dataset.group;
    page.classList.toggle("is-hidden", group !== showGroup);
  });
  let target = null;
  if (mode === "main") {
    target = targetPage || mainPages[0];
    currentMainIndex = mainPages.indexOf(target);
    if (target) {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    }
    document.body.classList.remove("interaction-mode");
    document.body.classList.add("main-mode");
  } else {
    target = targetPage || interactionPages[0];
    currentInteractionIndex = interactionPages.indexOf(target);
    if (target) {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    }
    document.body.classList.remove("main-mode");
    document.body.classList.add("interaction-mode");
  }

  stopAllAudio();
  hideAnalysisResult();
  setupPageObserver();
  updateArtGroup();

  if (target && target.id) {
    requestAnimationFrame(() => {
      updateArtPosition(target.id);
    });
  }
}
let pageObserver = null;
let currentPageId = null;
function setupPageObserver() {
  const container = document.querySelector(".container");
  const pages = document.querySelectorAll(".page:not(.is-hidden)");
  if (!pages.length || !container) return;

  if (pageObserver) {
    pageObserver.disconnect();
  }
  pageObserver = new IntersectionObserver((entries) => {
    let best = null;
    for (const e of entries) {
      if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
    }
    if (!best) return;
    if (best.intersectionRatio < 0.65) return;
    const newId = best.target.id || null;
    if (!newId) return;
    if (currentPageId && newId !== currentPageId) {
      stopAllAudio();
      //hideAnalysisResult();
      //playBtn.disabled = true;
      //textarea.value = "";
      //counter.textContent = 0;
    }
    currentPageId = newId;
    updateArtPosition(newId);
  }, {
    root: container,
    threshold: [0.2, 0.5, 0.8]
  });
  pages.forEach(p => pageObserver.observe(p));
  currentPageId = pages[0].id || null;
}
if (enterInteractionBtn) {
  enterInteractionBtn.addEventListener("click", () => {
    setMode("interaction");
  });
}
if (currentPageId) {
    updateArtPosition(currentPageId);
  }
closeInteractionBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    setMode("main");
    requestAnimationFrame(() => {
      fixHomeFX();
    }); 
  });
});
if (currentMode === "main") {
    mainArt.classList.add("is-active");
    interactionArt.classList.remove("is-active");
  } else {
    mainArt.classList.remove("is-active");
    interactionArt.classList.add("is-active");
  }
setMode("main");
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
sidebarLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const targetId = link.dataset.target;
    let target = null;
    let mode = null;
    if (targetId === "home-view") {
      target = mainPages[0];
      mode = "main";
    } else if (targetId === "experience-view-1") {
      target = interactionPages[0];
      mode = "interaction";
    } else if (targetId === "experience-view-2") {
      target = interactionPages[1];
      mode = "interaction";
    } else if (targetId === "catalog-view") {
      target = interactionPages[2];
      mode = "interaction";
    }
    if (!target || !mode) return;
    /* 先把焦點移回 toggle，再關閉 */
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    closeSidebar();
    setMode(mode, target);
  });
});
})();


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
function lockScroll(){
  window.addEventListener("keydown", preventScrollKeys, nonPassiveOption);
  window.addEventListener("wheel", preventScrollAction, nonPassiveOption);
  window.addEventListener("touchmove", preventScrollAction, nonPassiveOption);
}
function unlockScroll(){
  window.removeEventListener("keydown", preventScrollKeys, nonPassiveOption);
  window.removeEventListener("wheel", preventScrollAction, nonPassiveOption);
  window.removeEventListener("touchmove", preventScrollAction, nonPassiveOption);
}
let sidebarClosingTimer = null;
function openSidebar(){
  clearTimeout(sidebarClosingTimer);

  sidebarOverlay.classList.add("is-open");
  sidebarOverlay.setAttribute("aria-hidden", "false");
  sidebarToggles.forEach(btn => btn.classList.add("is-open"));

  document.body.classList.add("loading-lock");
  document.documentElement.classList.add("loading-lock");
  if (containerEl) containerEl.classList.add("loading-lock");
  lockScroll();
}
function closeSidebar(){
  if (document.activeElement && sidebarOverlay.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  sidebarOverlay.classList.remove("is-open");
  sidebarOverlay.setAttribute("aria-hidden", "true");
  sidebarToggles.forEach(btn => btn.classList.remove("is-open"));

  document.body.classList.remove("loading-lock");
  document.documentElement.classList.remove("loading-lock");
  if (containerEl) containerEl.classList.remove("loading-lock");
  unlockScroll();
}

function toggleSidebar(e){
  if (e) e.stopPropagation();

  if (sidebarOverlay.classList.contains("is-open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

sidebarToggles.forEach(btn => {
  btn.addEventListener("click", toggleSidebar);
});

/* 點背景也可收合 */
sidebarOverlay.addEventListener("click", (e) => {
  if (e.target === sidebarOverlay) {
    closeSidebar();
  }
});
if (sidebarPanel) {
  sidebarPanel.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

//滾動音符
(() => {
  const orb = document.getElementById("scroll-orb");
  const container = document.querySelector(".container");
  if (!orb || !container) return;
  const margin = 10;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  let ticking = false;
  function update() {
    ticking = false;
    const scrollTop = container.scrollTop;
    const scrollMax = Math.max(0, container.scrollHeight - container.clientHeight);
    const t = scrollMax ? clamp(scrollTop / scrollMax, 0, 1) : 0;

    const containerRect = container.getBoundingClientRect();
    const visibleH = containerRect.height;

    const orbH = orb.offsetHeight || 24;
    const yRange = Math.max(0, visibleH - margin * 2 - orbH);
    const y = margin + yRange * t;
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

  update();
})();

/* 取得 section 進場程度 */
function pageProgress(section, container){
  const sectionRect = section.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const sectionCenter = sectionRect.top + sectionRect.height / 2;
  const containerCenter = containerRect.top + containerRect.height / 2;

  const dist = Math.abs(sectionCenter - containerCenter);
  const range = containerRect.height * 0.85;

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
    section: el.closest(".page"),
    startX: x,
    startY: y,
    currentP: 0
  });
});
/* 更新動畫 */
function updateFX() {
  if (!containerEl) return;

  fxElements.forEach(item => {
    const { el, section, startX, startY } = item;
    if (!section || section.classList.contains("is-hidden")) return;

    const targetP = pageProgress(section, containerEl);
    item.currentP = lerp(item.currentP, targetP, 0.2);

    const x = lerp(startX, 0, item.currentP);
    const y = lerp(startY, 0, item.currentP);

    el.style.setProperty("--fx-x", `${x.toFixed(2)}px`);
    el.style.setProperty("--fx-y", `${y.toFixed(2)}px`);
    el.style.setProperty("--fx-o", item.currentP.toFixed(3));
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
if (containerEl) {
  containerEl.addEventListener("scroll", onScroll, { passive: true });
}

window.addEventListener("resize", () => {
  updateFX();
  fixHomeFX();
});
updateFX();
requestAnimationFrame(() => {
  fixHomeFX();
});

//清除

clearBtn.addEventListener("click", () => {
    textarea.value = "";
    counter.textContent = 0;
    playBtn.classList.add("hidden-btn");
    playBtn.classList.remove("visible-btn");
    playBtn.disabled = true;
    hideAnalysisResult();
});
//計算字數

if (textarea && counter) {
  textarea.addEventListener("input", () => {
    counter.textContent = textarea.value.length;
  });
}

function showLoading() {
  if (!loadingOverlay) return;
  loadingOverlay.classList.remove("hidden");
  document.documentElement.classList.add("loading-lock");
  loadingOverlay.setAttribute("aria-hidden", "false");
  lockScroll();
}
function hideLoading() {
  if (!loadingOverlay) return;
  loadingOverlay.classList.add("hidden");
  document.documentElement.classList.remove("loading-lock");
  loadingOverlay.setAttribute("aria-hidden", "true");
  unlockScroll();
}
document.querySelectorAll(".slider-wrap").forEach(wrap => {
  const slider = wrap.querySelector(".slider");
  const cards = wrap.querySelectorAll(".slider-card");
  const dots = wrap.querySelectorAll(".slider-dots .dot");
  if (!slider || !cards.length || !dots.length) return;
  function updateDots() {
    const rect = slider.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    let closest = 0;
    let min = Infinity;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const c = r.left + r.width / 2;
      const d = Math.abs(c - center);
      if (d < min) {
        min = d;
        closest = i;
      }
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === closest);
    });
  }
  slider.addEventListener("scroll", () => {
    requestAnimationFrame(updateDots);
  });
  updateDots();
});