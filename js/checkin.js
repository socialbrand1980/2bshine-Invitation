// 2bShine Check-in — Scan QR (Ticket ID) -> update Google Sheet (JSONP, no fetch)
const API_URL = window.API_URL;

const CHECKIN_PIN = window.CHECKIN_PIN || "";
const AUTH_KEY = "checkin_auth_ok";

function isAuthed(){
  return sessionStorage.getItem(AUTH_KEY) === "1";
}

function setAuthed(){
  sessionStorage.setItem(AUTH_KEY, "1");
}

function showPinGate(){
  const modal = document.querySelector("#pinModal");
  const input = document.querySelector("#pinInput");
  const err = document.querySelector("#pinError");
  const form = document.querySelector("#pinForm");

  if(!modal) return;

  // kalau PIN belum diset, skip gate
  if(!CHECKIN_PIN){
    setAuthed();
    return;
  }

  if(isAuthed()) return;

  err.textContent = "";
  modal.showModal();
  setTimeout(() => input?.focus(), 50);

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = String(input?.value || "").trim();

    if(val === CHECKIN_PIN){
      setAuthed();
      modal.close();
      err.textContent = "";
      input.value = "";
      // auto start scanner setelah login
      startScanner?.();
    }else{
      err.textContent = "PIN salah. Coba lagi ya.";
      input.value = "";
      input?.focus();
    }
  });
}

function showResultPopup(title, text){
  const modal = document.querySelector("#resultModal");
  const t = document.querySelector("#resultTitle");
  const p = document.querySelector("#resultText");
  const close = document.querySelector("#resultClose");

  if(!modal) return;

  t.textContent = title;
  p.textContent = text;

  // jika sedang kebuka, refresh isinya
  if(!modal.open) modal.showModal();

  const onClose = () => {
    try{ modal.close(); }catch{}
    close?.removeEventListener("click", onClose);
  };

  close?.addEventListener("click", onClose);

  // auto close (optional)
  clearTimeout(showResultPopup._t);
  showResultPopup._t = setTimeout(() => {
    if(modal.open) onClose();
  }, 1600);
}


const $ = (sel) => document.querySelector(sel);

function setLog(msg, ok=null){
  const el = $("#log");
  if(!el) return;
  el.textContent = msg;
  el.classList.remove("ok","bad");
  if(ok === true) el.classList.add("ok");
  if(ok === false) el.classList.add("bad");
}

function ensureApiUrl(){
  if(!API_URL || API_URL.includes("PASTE_YOUR")){
    throw new Error("API_URL belum diisi di js/config.js");
  }
}

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

    // add callback param
    s.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cbName;
    document.body.appendChild(s);
  });
}

async function apiCheckin(ticket_id){
  ensureApiUrl();
  const url = `${API_URL}?action=checkin&ticket_id=${encodeURIComponent(ticket_id)}`;
  return jsonp(url);
}

// theme toggle (biar sama kaya sebelumnya)
(function setupTheme(){
  const key = "inv_theme";
  const saved = localStorage.getItem(key);
  if(saved) document.documentElement.setAttribute("data-theme", saved);

  const t = $("#themeToggle");
  if(!t) return;
  t.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "" : "dark";
    if(next) document.documentElement.setAttribute("data-theme", next);
    else document.documentElement.removeAttribute("data-theme");
    localStorage.setItem(key, next || "");
  });
})();

let html5QrCode;
let running = false;
let lock = false;
let last = "";

// Handle scan
async function handleTicket(ticket_id){
  ticket_id = String(ticket_id || "").trim();
  if(!ticket_id) return;

  if(lock || ticket_id === last) return;
  lock = true;
  last = ticket_id;

  setLog("Checking in: " + ticket_id + "...");

  try{
    const data = await apiCheckin(ticket_id);

    if(!data || !data.ok){
      setLog("GAGAL: " + (data?.error || "Unknown error") + " (" + ticket_id + ")", false);
      return;
    }

    if(data.already){
  setLog("SUDAH HADIR ✅ " + data.nama + " (" + ticket_id + ")", true);
  showResultPopup("Sudah Hadir ✅", `${data.nama} (${ticket_id})`);
    }else{
  setLog("CHECK-IN BERHASIL ✅ " + data.nama + " (" + ticket_id + ")", true);
  showResultPopup("Berhasil ✅", `${data.nama} (${ticket_id})`);
    }

  }catch(e){
    setLog("Error: " + e.message, false);
  }finally{
    setTimeout(()=>{ lock=false; }, 1200);
    setTimeout(()=>{ last=""; }, 2000);
  }
}

async function startScanner(){
  if(running) return;

  try{
    if(typeof Html5Qrcode === "undefined"){
      setLog("Library Html5Qrcode belum kebaca. Cek script CDN di checkin.html.", false);
      return;
    }

    html5QrCode = new Html5Qrcode("reader");
    const cameras = await Html5Qrcode.getCameras();

    if(!cameras || cameras.length === 0){
      setLog("Tidak ada kamera terdeteksi.", false);
      return;
    }

    // prefer back camera if possible
    const backCam = cameras.find(c => /back|rear|environment/i.test(c.label || ""));
    const camId = (backCam || cameras[0]).id;

    await html5QrCode.start(
      camId,
      { fps: 10, qrbox: { width: 260, height: 260 } },
      (decodedText) => handleTicket(decodedText)
    );

    running = true;
    setLog("Scanner aktif. Arahkan QR ke kotak scan…");
  }catch(e){
    setLog("Tidak bisa akses kamera: " + (e?.message || e), false);
  }
}

async function stopScanner(){
  if(!running || !html5QrCode) return;
  try{
    await html5QrCode.stop();
    await html5QrCode.clear();
    running = false;
    setLog("Scanner berhenti.");
  }catch(e){
    setLog("Gagal stop scanner: " + (e?.message || e), false);
  }
}

$("#btnStart")?.addEventListener("click", () => {
  if(!isAuthed()){ showPinGate(); return; }
  startScanner();
});

$("#btnStop")?.addEventListener("click", stopScanner);


$("#btnManualCheckin")?.addEventListener("click", () => {
  if(!isAuthed()){ showPinGate(); return; }
  handleTicket($("#manualTicket")?.value);
});

// auto start on load (setelah login)
showPinGate();
if(isAuthed()) startScanner();
