const themeToggle = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');


const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);

themeToggle.addEventListener('click', function () {

  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('theme', next);
});

function applyTheme(theme) {

  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

const toggleUnit = document.getElementById('toggleUnit');
const unitDetail = document.getElementById('unitDetail');
const unitArrow  = document.getElementById('unitArrow');

toggleUnit.addEventListener('click', function () {

  const isOpen = unitDetail.classList.contains('open');

  if (isOpen) {
    unitDetail.classList.remove('open');
    unitArrow.classList.remove('open');
    toggleUnit.setAttribute('aria-expanded', 'false');
    toggleUnit.innerHTML = 'ดูรายละเอียด <span class="arrow" id="unitArrow">▸</span>';
  } else {
    unitDetail.classList.add('open');
    unitArrow.classList.add('open');
    toggleUnit.setAttribute('aria-expanded', 'true');
    toggleUnit.innerHTML = 'ซ่อน <span class="arrow open" id="unitArrow">▸</span>';
  }
});


/* ── 3. LIVE INPUT PREVIEW ───────────────────────────────── */
const greetInput  = document.getElementById('greetInput');
const liveOutput  = document.getElementById('liveOutput');

greetInput.addEventListener('input', function () {
  const val = greetInput.value.trim();

  if (val === '') {
    // ถ้าไม่มีข้อความ แสดง placeholder กลับมา
    liveOutput.innerHTML = '<span class="output-placeholder">ผลลัพธ์จะปรากฏที่นี่</span>';
  } else {
    // แสดงข้อความที่พิมพ์ พร้อมชื่อทักทายกลับ
    liveOutput.textContent = `"${val}" — สวัสดีครับ! ผม นาย ยินดีที่ได้รู้จัก 👋`;
  }
});


/* ── 4. LIKE COUNTER ────────────────────────────────────── */
const likeBtn   = document.getElementById('likeBtn');
const likeCount = document.getElementById('likeCount');

let likes = 0;

likeBtn.addEventListener('click', function () {
  likes++;
  likeCount.textContent = likes.toLocaleString('th-TH');

  likeBtn.classList.remove('liked');
  void likeBtn.offsetWidth;
  likeBtn.classList.add('liked');
});


/* ── 5. SKILL CARD HOVER TEXT (JavaScript side) ─────────── */
// CSS จัดการ opacity แล้ว แต่เราใส่ข้อความจาก data-detail ด้วย JS
const skillCards = document.querySelectorAll('.skill-card');

skillCards.forEach(function (card) {
  // ดึงข้อความจาก attribute data-detail ใส่ใน .skill-hover-text
  const detail    = card.getAttribute('data-detail');
  const hoverSpan = card.querySelector('.skill-hover-text');
  if (hoverSpan) hoverSpan.textContent = detail;
});


/* ── 6. GOLD PRICE API ───────────────────────────────────── */
/*
  ฟังก์ชั่นนี้ทำงานแบบเรียบง่าย: ดึงราคา XAU/USD จาก API สาธารณะทุก 1 วินาที
  แล้วแสดงราคาซื้อ ราคาขาย เปอร์เซ็นต์การเปลี่ยนแปลง และเวลาอัปเดตล่าสุด
  โดยไม่มีกราฟ เพื่อให้โค้ดอ่านง่ายและเข้าใจขั้นตอนการทำงานได้ชัดเจน
*/

const goldLoading    = document.getElementById('goldLoading');
const goldDataEl     = document.getElementById('goldData');
const goldError      = document.getElementById('goldError');
const goldBid        = document.getElementById('goldBid');
const goldAsk        = document.getElementById('goldAsk');
const goldChange     = document.getElementById('goldChange');
const goldTs         = document.getElementById('goldTs');
const goldCountdown  = document.getElementById('goldCountdown');
const goldRefreshBtn = document.getElementById('goldRefreshBtn');
const goldRetryBtn   = document.getElementById('goldRetryBtn');
const GOLD_API_URL = 'https://api.gold-api.com/price/XAU';
const REFRESH_INTERVAL_MS = 1000;
const THAI_TIMEZONE = 'Asia/Bangkok';



let refreshTimer = null;
let isFetchingGold = false;
let todayOpenPrice = null;
let todayOpenSource = 'waiting';

function getThaiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: THAI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function readStoredDailyOpen() {
  const key = `goldDailyOpen:${getThaiDateKey()}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    return Number.isFinite(parsed.price) ? parsed : null;
  } catch (err) {
    localStorage.removeItem(key);
    return null;
  }
}

function saveDailyOpen(price, source) {
  const key = `goldDailyOpen:${getThaiDateKey()}`;
  localStorage.setItem(key, JSON.stringify({ price, source, savedAt: new Date().toISOString() }));
  todayOpenPrice = price;
  todayOpenSource = source;
}

function syncTodayOpen(data, price) {
  const apiOpen = [data.open, data.open_price, data.price_open, data.day_open]
    .map(Number)
    .find(Number.isFinite);

  if (apiOpen) {
    saveDailyOpen(apiOpen, '00:00');
    return;
  }

  const stored = readStoredDailyOpen();
  if (stored) {
    todayOpenPrice = stored.price;
    todayOpenSource = stored.source || 'saved';
    return;
  }

  saveDailyOpen(price, 'first-tick');
}

function updateDailyChange(currentPrice) {
  if (!todayOpenPrice) {
    goldChange.textContent = '—';
    goldChange.style.color = '#8B9BAD';
    return;
  }

  const diff = currentPrice - todayOpenPrice;
  const pct = (diff / todayOpenPrice) * 100;
  const sign = diff >= 0 ? '+' : '';
  goldChange.textContent = `${sign}${pct.toFixed(2)}% · ${sign}${diff.toFixed(2)} จุด`;
  goldChange.style.color = diff >= 0 ? '#4ADE80' : '#F87171';
}

async function fetchGoldPrice() {
  if (isFetchingGold) return;
  isFetchingGold = true;

  try {
    const res = await fetch(GOLD_API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const price = Number(data.price);
    if (!Number.isFinite(price)) throw new Error('ไม่พบฟิลด์ price ใน response');

    syncTodayOpen(data, price);

    const bid = Number.isFinite(Number(data.bid)) ? Number(data.bid) : price - 0.50;
    const ask = Number.isFinite(Number(data.ask)) ? Number(data.ask) : price;
    goldBid.textContent = '$' + bid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    goldAsk.textContent = '$' + ask.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    updateDailyChange(price);

    const now = new Date();
    const sourceText = todayOpenSource === '00:00' ? 'ฐานราคา 00:00 วันนี้' : 'ฐานสำรอง: ราคาแรกที่โหลดวันนี้';
    goldTs.textContent = `อัปเดต: ${now.toLocaleString('th-TH')} · ${sourceText}`;
    goldCountdown.textContent = 'อัปเดตทุก 1 วิ';
    showGoldState('data');
  } catch (err) {
    console.error('Gold API error:', err);
    showGoldState('error');
  } finally {
    isFetchingGold = false;
  }
}

function showGoldState(state) {
  goldLoading.classList.add('hidden');
  goldDataEl.classList.add('hidden');
  goldError.classList.add('hidden');
  if (state === 'data')  goldDataEl.classList.remove('hidden');
  if (state === 'error') goldError.classList.remove('hidden');
  if (state === 'loading') goldLoading.classList.remove('hidden');
}

function startGoldAutoRefresh() {
  clearInterval(refreshTimer);
  fetchGoldPrice();
  refreshTimer = setInterval(fetchGoldPrice, REFRESH_INTERVAL_MS);
}

goldRefreshBtn.addEventListener('click', function () {
  goldRefreshBtn.classList.add('spinning');
  setTimeout(() => goldRefreshBtn.classList.remove('spinning'), 500);
  fetchGoldPrice();
});

goldRetryBtn.addEventListener('click', function () {
  showGoldState('loading');
  startGoldAutoRefresh();
});

startGoldAutoRefresh();
