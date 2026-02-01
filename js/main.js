// 2bShine Invitation Pro — RSVP to Google Sheet + QR Ticket (Safari-safe JSONP)
const API_URL = window.API_URL;
const EVENT = window.EVENT;

const $ = (sel) => document.querySelector(sel);

function pad2(n){ return String(n).padStart(2, "0"); }
function capitalize(s){ return s ? s[0].toUpperCase() + s.slice(1) : s; }

function showToast(msg){
  const toast = $("#toast");
  if(!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2400);
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch(e){
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  }
}

// ==========================
// JSONP helper (anti CORS Safari)
// ==========================
function jsonp(url){
  return new Promise((resolve, reject) => {
    const cbName = "__cb_" + Math.random().toString(16).slice(2);
    const s = document.createElement("script");

    window[cbName] = (data) => {
      resolve(data);
      delete window[cbName];
      s.remove();
    };

    s.onerror = () => {
      reject(new Error("Load failed (jsonp). Cek API_URL & deploy Apps Script."));
      delete window[cbName];
      s.remove();
    };

    s.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cbName;
    document.body.appendChild(s);
  });
}

// ==========================
// API builders (GET + JSONP)
// ==========================
function ensureApiUrl(){
  if(!API_URL || API_URL.includes("PASTE_YOUR")){
    throw new Error("API_URL belum diisi di js/config.js");
  }
}

async function apiRSVP({ nama, whatsapp, jumlah_tamu, catatan }){
  ensureApiUrl();
  const url =
    `${API_URL}?action=rsvp` +
    `&nama=${encodeURIComponent(nama)}` +
    `&whatsapp=${encodeURIComponent(whatsapp)}` +
    `&jumlah_tamu=${encodeURIComponent(jumlah_tamu || "1")}` +
    `&catatan=${encodeURIComponent(catatan || "")}`;

  return jsonp(url);
}

// ==========================
// Inject event info
// ==========================
function setEventTexts(){
  $("#eventVenueText").textContent = EVENT.venue;
  $("#addressText").textContent = EVENT.address;

  const start = new Date(EVENT.startISO);
  const end = new Date(EVENT.endISO);

  const dayName = new Intl.DateTimeFormat("id-ID", { weekday:"long", timeZone:"Asia/Jakarta" }).format(start);
  const dateStr = new Intl.DateTimeFormat("id-ID", { day:"2-digit", month:"long", year:"numeric", timeZone:"Asia/Jakarta" }).format(start);
  $("#eventDateText").textContent = `${capitalize(dayName)}, ${dateStr}`;

  const startTime = new Intl.DateTimeFormat("id-ID", { hour:"2-digit", minute:"2-digit", hour12:false, timeZone:"Asia/Jakarta" }).format(start);
  const endTime = new Intl.DateTimeFormat("id-ID", { hour:"2-digit", minute:"2-digit", hour12:false, timeZone:"Asia/Jakarta" }).format(end);
  $("#eventTimeText").textContent = `${startTime} – ${endTime} WIB`;

  const mapsUrl = EVENT.mapsQuery.startsWith("http")
    ? EVENT.mapsQuery
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(EVENT.mapsQuery)}`;
  $("#btnMaps").href = mapsUrl;
}

// ==========================
// Countdown
// ==========================
function startCountdown(){
  const dEl = $("#cdDays"), hEl = $("#cdHours"), mEl = $("#cdMins"), sEl = $("#cdSecs");
  const start = new Date(EVENT.startISO).getTime();

  function tick(){
    const now = Date.now();
    let diff = Math.max(0, start - now);

    const days = Math.floor(diff / (1000*60*60*24));
    diff -= days * (1000*60*60*24);

    const hours = Math.floor(diff / (1000*60*60));
    diff -= hours * (1000*60*60);

    const mins = Math.floor(diff / (1000*60));
    diff -= mins * (1000*60);

    const secs = Math.floor(diff / 1000);

    dEl.textContent = pad2(days);
    hEl.textContent = pad2(hours);
    mEl.textContent = pad2(mins);
    sEl.textContent = pad2(secs);
  }

  tick();
  setInterval(tick, 1000);
}

// ==========================
// Theme toggle
// ==========================
function setupTheme(){
  const key = "inv_theme";
  const saved = localStorage.getItem(key);
  if(saved) document.documentElement.setAttribute("data-theme", saved);

  $("#themeToggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "" : "dark";
    if(next) document.documentElement.setAttribute("data-theme", next);
    else document.documentElement.removeAttribute("data-theme");
    localStorage.setItem(key, next || "");
  });
}

// ==========================
// Calendar (ICS download)
// ==========================
function setupCalendar(){
  $("#btnAddCalendar").addEventListener("click", () => {
    const dtStart = toICSDate(EVENT.startISO);
    const dtEnd = toICSDate(EVENT.endISO);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//2bShine//Invitation//ID",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${cryptoRandom()}@2bshine`,
      `DTSTAMP:${toICSDate(new Date().toISOString())}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICS(EVENT.title)}`,
      `LOCATION:${escapeICS(EVENT.venue + " — " + EVENT.address)}`,
      `DESCRIPTION:${escapeICS("Dress code: Soft Pink / Nude / White. Simpan QR ticket untuk check-in.")}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "2bshine-grand-opening.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("File kalender di-download ✨");
  });
}

function toICSDate(iso){
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth()+1);
  const dd = pad2(d.getUTCDate());
  const hh = pad2(d.getUTCHours());
  const mi = pad2(d.getUTCMinutes());
  const ss = pad2(d.getUTCSeconds());
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}
function escapeICS(s){
  return String(s).replace(/[\\,;]/g, "\\$&").replace(/\n/g, "\\n");
}
function cryptoRandom(){
  try{
    return crypto.getRandomValues(new Uint32Array(4)).join("-");
  }catch{
    return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  }
}

// ==========================
// Share
// ==========================
function setupShare(){
  $("#btnShare").addEventListener("click", async () => {
    const shareData = {
      title: (EVENT && EVENT.title) ? EVENT.title : "Undangan — 2bShine Clinic",
      text: (EVENT && EVENT.title) ? `${EVENT.title} — ${EVENT.venue}` : "Undangan Grand Opening Clinic 2bShine — Intimate Brand Experience",
      url: window.location.href
    };

    try{
      if(navigator.share){
        await navigator.share(shareData);
      }else{
        await copyText(window.location.href);
        showToast("Link undangan dicopy ✨");
      }
    }catch(e){
      await copyText(window.location.href);
      showToast("Link undangan dicopy ✨");
    }
  });
}

// ==========================
// Copy address
// ==========================
function setupCopyAddress(){
  $("#btnCopyAddress").addEventListener("click", async () => {
    await copyText(EVENT.address);
    showToast("Alamat dicopy ✨");
  });
}

// ==========================
// Music
// ==========================
function setupMusic(){
  const audio = $("#bgm");
  const btn = $("#btnPlayMusic");
  const hintId = "soundHint";

  function showEnableHint(){
    let hint = document.getElementById(hintId);
    if(!hint){
      hint = document.createElement('div');
      hint.id = hintId;
      hint.className = 'soundHint';
      hint.textContent = 'Tap anywhere untuk mengaktifkan suara';
      document.body.appendChild(hint);
    }
    hint.style.display = 'block';
  }
  function hideEnableHint(){
    const hint = document.getElementById(hintId);
    if(hint) hint.style.display = 'none';
  }

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  async function attemptAutoplay(){
    if(!audio || (!audio.src && audio.children.length === 0)){
      showToast("Tambahkan file audio di assets/audio/bgm.mp3 di folder assets/audio/.");
      return false;
    }

    // try to play muted first (more likely to be allowed)
    try{
      audio.muted = true;
      audio.volume = 0.001;
      await audio.play();
      // if play succeeded muted, try to unmute gracefully
      try{
        // give a moment and try to unmute; some browsers still block unmute
        await sleep(400);
        audio.muted = false;
        // ramp up volume
        for(let v = 0.05; v <= 0.8; v += 0.05){ audio.volume = v; await sleep(40); }
        btn.innerHTML = `Pause Music <span aria-hidden="true">❚❚</span>`;
        hideEnableHint();
        return true;
      }catch(e){
        // unmute blocked; leave muted but consider autoplay success
        showEnableHint();
        btn.innerHTML = `Play Music <span aria-hidden="true">♫</span>`;
        return true;
      }
    }catch(e){
      // autoplay entirely blocked
      showEnableHint();
      showToast('Autoplay diblokir. Tap layar atau tekan Play untuk mengaktifkan audio.');
      return false;
    }
  }

  // If user interacts (first pointerdown), try to enable audio
  function setupUserGestureUnlock(){
    const onFirst = async () => {
      document.removeEventListener('pointerdown', onFirst);
      try{
        if(audio.paused){
          audio.muted = false;
          await audio.play();
        }else{
          audio.muted = false;
        }
        // ramp volume
        let target = 0.8;
        for(let v = 0.05; v <= target; v += 0.05){ audio.volume = v; await sleep(40); }
        btn.innerHTML = `Pause Music <span aria-hidden="true">❚❚</span>`;
        hideEnableHint();
      }catch(e){
        showToast('Tidak bisa mengaktifkan audio otom. Silakan tekan tombol Play.');
      }
    };

    document.addEventListener('pointerdown', onFirst, { once:true });
  }

  // init
  setTimeout(() => { attemptAutoplay(); setupUserGestureUnlock(); }, 250);

  // button behaviour
  btn.addEventListener("click", async () => {
    if(!audio || (!audio.src && audio.children.length === 0)){
      showToast("Tambahkan file audio di assets/audio/bgm.mp3 di folder assets/audio/.");
      return;
    }
    if(audio.paused){
      try{
        audio.muted = false;
        await audio.play();
        btn.innerHTML = `Pause Music <span aria-hidden="true">❚❚</span>`;
        hideEnableHint();
      }catch(e){
        showToast('Autoplay diblok browser. Tap layar dulu atau tekan lagi.');
        showEnableHint();
      }
    }else{
      audio.pause();
      btn.innerHTML = `Play Music <span aria-hidden="true">♫</span>`;
    }
  });
}

// ==========================
// Modal
// ==========================
function setupModal(){
  const dialog = $("#rsvpModal");
  const openBtn = $("#btnOpenModal");
  const closeBtn = $("#btnCloseModal");
  const cancelBtn = $("#btnCancelDialog");
  const modalForm = $("#rsvpModalForm");

  openBtn.addEventListener("click", () => dialog.showModal());
  closeBtn.addEventListener("click", () => dialog.close());
  cancelBtn.addEventListener("click", () => dialog.close());

  modalForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nama = $("#mName").value.trim();
    const whatsapp = $("#mWhatsapp").value.trim();
    const presence = $("#mPresence").value;

    try{
      const data = await apiRSVP({
        nama,
        whatsapp,
        jumlah_tamu: "1",
        catatan: `RSVP Modal — Kehadiran: ${presence}`
      });

      if(!data.ok){
        showToast("Gagal RSVP: " + data.error);
        return;
      }

      dialog.close();
      modalForm.reset();
      showToast("RSVP sukses. QR sudah dibuat ✨");

      document.querySelector("#rsvp").scrollIntoView({ behavior: "smooth" });
      renderSuccessTicket(data.ticket_id, nama, whatsapp, "1", `Modal: ${presence}`);

    }catch(err){
      showToast(err.message);
    }
  });

  $("#btnOpenRsvp").addEventListener("click", () => {
    document.querySelector("#rsvp").scrollIntoView({ behavior: "smooth" });
  });
}

// ==========================
// RSVP + QR
// ==========================
let qr;

function initQR(){
  const qrBox = $("#qrBox");
  if(!qrBox) return;
  qr = new QRCode(qrBox, { text: "", width: 180, height: 180 });
}

function buildRsvpText(payload, ticketId){
  return [
    `RSVP — ${EVENT.title}`,
    `Ticket ID: ${ticketId}`,
    `Nama: ${payload.nama}`,
    `WA: ${payload.whatsapp}`,
    `Jumlah tamu: ${payload.jumlah_tamu}`,
    `Catatan: ${payload.catatan || "-"}`,
    `Tanggal: ${$("#eventDateText").textContent}`,
    `Jam: ${$("#eventTimeText").textContent}`,
    `Lokasi: ${EVENT.venue}`
  ].join("\n");
}

function renderSuccessTicket(ticketId, nama, whatsapp, jumlah_tamu, catatan){
  $("#successTicket").textContent = ticketId;
  $("#rsvpSuccess").classList.add("show");

  // regenerate QR with Ticket ID
  $("#qrBox").innerHTML = "";
  qr = new QRCode($("#qrBox"), { text: ticketId, width: 180, height: 180 });

  window.__lastTicket = { ticket_id: ticketId, nama, whatsapp, jumlah_tamu, catatan };
}

function setupRsvp(){
  const form = $("#rsvpForm");
  const btnCopy = $("#btnCopyRsvp");
  const btnDownloadQr = $("#btnDownloadQr");
  const btnCopyTicket = $("#btnCopyTicket");
  const btnSubmit = $("#btnSubmitRsvp");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      nama: $("#name").value.trim(),
      whatsapp: $("#whatsapp").value.trim(),
      jumlah_tamu: $("#guests").value,
      catatan: $("#note").value.trim(),
    };

    if(!payload.nama || !payload.whatsapp){
      showToast("Nama & WhatsApp wajib diisi ya.");
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.style.opacity = ".75";

    try{
      const data = await apiRSVP(payload);

      if(!data.ok){
        showToast("Gagal RSVP: " + data.error);
        return;
      }

      renderSuccessTicket(data.ticket_id, payload.nama, payload.whatsapp, payload.jumlah_tamu, payload.catatan);
      showToast("RSVP sukses ✨ QR sudah dibuat.");

      const txt = buildRsvpText(payload, data.ticket_id);
      await copyText(txt);

      form.reset();
    }catch(err){
      showToast(err.message);
    }finally{
      btnSubmit.disabled = false;
      btnSubmit.style.opacity = "1";
    }
  });

  btnCopy.addEventListener("click", async () => {
    const last = window.__lastTicket;
    if(!last){
      showToast("Isi RSVP dulu biar ada Ticket ID ya.");
      return;
    }
    const txt = buildRsvpText({
      nama: last.nama,
      whatsapp: last.whatsapp,
      jumlah_tamu: last.jumlah_tamu,
      catatan: last.catatan
    }, last.ticket_id);
    await copyText(txt);
    showToast("Teks RSVP dicopy ✨");
  });

  btnCopyTicket.addEventListener("click", async () => {
    const last = window.__lastTicket;
    if(!last) return showToast("Belum ada ticket.");
    await copyText(last.ticket_id);
    showToast("Ticket ID dicopy ✨");
  });

  btnDownloadQr.addEventListener("click", () => {
    const img = $("#qrBox img");
    const canvas = $("#qrBox canvas");
    const dataUrl = img?.src || canvas?.toDataURL?.("image/png");

    if(!dataUrl){
      showToast("QR belum tersedia.");
      return;
    }

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `2bshine-ticket-${($("#successTicket").textContent || "qr")}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast("QR di-download ✨");
  });
}

// ==========================
// Scroll top
// ==========================
function setupScrollTop(){
  $("#btnScrollTop").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ==========================
// Smooth anchor links fallback
// ==========================
function setupSmoothScrollLinks(){
  // handle same-page anchor clicks for browsers that don't support CSS smooth scrolling
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if(!a) return;
    const href = a.getAttribute('href');
    if(!href || href === '#') return;
    const target = document.querySelector(href);
    if(target){
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      // update history without jumping
      try{ history.pushState(null, '', href); }catch{}
    }
  });
}

// ==========================
// Init
// ==========================
setEventTexts();
startCountdown();
setupTheme();
setupCalendar();
setupShare();
setupCopyAddress();
setupMusic();
setupModal();
setupRsvp();
setupScrollTop();
setupSmoothScrollLinks();
initQR();
