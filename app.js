
"use strict";

/* ============================================
   ANIP DESKTOP
   Local-first desktop simulation
   Vanilla JavaScript • No framework
   ============================================ */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const desktop = $("#desktop");
const layer = $("#windowLayer");
const launchpad = $("#launchpad");
const appGrid = $("#appGrid");
const appSearch = $("#appSearch");
const toastEl = $("#toast");

const state = {
  zIndex: 100,
  activeWindow: null,
  openWindows: new Map(),
  notes: JSON.parse(localStorage.getItem("anip-notes") || "[]"),
  wallpaper: localStorage.getItem("anip-wallpaper") || "",
  dark: localStorage.getItem("anip-dark") !== "false",
  focus: false,
  notifications: [],
  finderLocation: "Home",
  clockTimer: null
};

const appDefinitions = [
  { id: "finder", name: "Finder", symbol: "⌂", color: "finder", width: 720, height: 470 },
  { id: "launchpad", name: "Launchpad", symbol: "✣", color: "launch", width: 650, height: 450 },
  { id: "notes", name: "Notes", symbol: "▤", color: "notes", width: 640, height: 470 },
  { id: "calculator", name: "Calculator", symbol: "＋", color: "calc", width: 330, height: 470 },
  { id: "calendar", name: "Calendar", symbol: "▦", color: "calendar", width: 540, height: 450 },
  { id: "settings", name: "System Settings", symbol: "⚙", color: "settings", width: 690, height: 490 },
  { id: "trash", name: "Trash", symbol: "♲", color: "trash", width: 520, height: 390 },
  { id: "about", name: "About This Mac", symbol: "◉", color: "about", width: 420, height: 380 }
];

const iconMarkup = {
  finder: `<svg viewBox="0 0 48 48"><path fill="#83BDF7" d="M6 10h36v28H6z"/><path fill="#BDE1FF" d="M6 10h18v28H6z"/><path d="M24 10v28" stroke="#fff" stroke-width="1.5"/></svg>`,
  notes: `<svg viewBox="0 0 48 48"><rect x="7" y="5" width="34" height="38" rx="5" fill="#fff"/><path d="M8 14h32" stroke="#E8B94B" stroke-width="8"/><path d="M14 23h20M14 29h20M14 35h14" stroke="#C5CAD4" stroke-width="1.7"/></svg>`,
  calculator: `<svg viewBox="0 0 48 48"><rect x="6" y="4" width="36" height="40" rx="8" fill="#454955"/><rect x="11" y="9" width="26" height="9" rx="2" fill="#A6E5D1"/><g fill="#E4E6EC"><circle cx="15" cy="25" r="2.5"/><circle cx="24" cy="25" r="2.5"/><circle cx="33" cy="25" r="2.5"/><circle cx="15" cy="34" r="2.5"/><circle cx="24" cy="34" r="2.5"/><circle cx="33" cy="34" r="2.5"/></g></svg>`,
  calendar: `<svg viewBox="0 0 48 48"><rect x="5" y="7" width="38" height="36" rx="7" fill="#fff"/><path d="M5 14q0-7 7-7h24q7 0 7 7v4H5z" fill="#EF6C67"/><text x="24" y="34" font-size="21" text-anchor="middle" fill="#303441" font-weight="700">${new Date().getDate()}</text></svg>`,
  settings: `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="#9DA8B9"/><circle cx="24" cy="24" r="12" fill="#586276"/><circle cx="24" cy="24" r="6" fill="#E4E8EF"/></svg>`,
  launchpad: `<span class="launch-emoji">✣</span>`,
  trash: `<svg viewBox="0 0 48 48"><path d="M13 13h22l-2 29H15z" fill="#D9E0EA"/><path d="M10 10h28M19 10V6h10v4" fill="none" stroke="#9EA9B8" stroke-width="3" stroke-linecap="round"/></svg>`
};

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function notify(message, symbol = "✦") {
  const notification = {
    message,
    symbol,
    time: new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit"
    })
  };

  state.notifications.unshift(notification);
  state.notifications = state.notifications.slice(0, 12);
  renderNotifications();

  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toastEl.classList.remove("show"), 2300);
}

function renderNotifications() {
  const list = $("#notificationList");
  if (!state.notifications.length) {
    list.innerHTML = `<p class="muted">Kamu sudah mengejar semua notifikasi.</p>`;
    return;
  }

  list.innerHTML = state.notifications.map(item => `
    <article class="notification-card">
      <span class="notification-symbol">${escapeHTML(item.symbol)}</span>
      <div>
        <b>Anip Desktop</b>
        <p>${escapeHTML(item.message)}</p>
        <small>${escapeHTML(item.time)}</small>
      </div>
    </article>
  `).join("");
}

function updateClock() {
  const now = new Date();
  $("#menuClock").textContent = now.toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).replace(/\./g, ":");

  $("#dockDay").textContent = now.getDate();
  $("#dockMonth").textContent = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
  $("#calendarDayIcon").textContent = now.getDate();
}

function getApp(id) {
  return appDefinitions.find(app => app.id === id);
}

function makeAppIcon(app) {
  if (iconMarkup[app.id]) {
    return `<span class="app-icon ${app.color}-icon">${iconMarkup[app.id]}</span>`;
  }

  return `<span class="launch-emoji">${escapeHTML(app.symbol)}</span>`;
}

function renderLaunchpad(filter = "") {
  const query = filter.trim().toLowerCase();
  const matches = appDefinitions.filter(app =>
    app.name.toLowerCase().includes(query) ||
    app.id.toLowerCase().includes(query)
  );

  appGrid.innerHTML = matches.map(app => `
    <button class="launch-app" data-open="${app.id}">
      ${makeAppIcon(app)}
      <span>${escapeHTML(app.name)}</span>
    </button>
  `).join("");

  if (!matches.length) {
    appGrid.innerHTML = `<p class="muted">Tidak ada aplikasi yang cocok.</p>`;
  }
}

function showLaunchpad() {
  closePanels();
  renderLaunchpad(appSearch.value);
  launchpad.classList.remove("hidden");
  appSearch.focus();
}

function closePanels(except = "") {
  ["controlPanel", "notificationPanel", "launchpad", "contextMenu"].forEach(id => {
    if (id !== except) $("#" + id)?.classList.add("hidden");
  });
}

function focusWindow(win) {
  if (!win || !win.isConnected) return;

  $$(".window").forEach(item => item.classList.remove("focused"));
  win.classList.remove("minimized");
  win.style.display = "flex";
  win.style.zIndex = ++state.zIndex;
  win.classList.add("focused");
  state.activeWindow = win;
}

function getAppContent(id) {
  switch (id) {
    case "finder":
      return `
        <div class="app-layout">
          <aside class="sidebar">
            <div class="sidebar-heading">Favorites</div>
            <button class="sidebar-item active" data-finder-location="Home"><span>⌂</span>Home</button>
            <button class="sidebar-item" data-finder-location="Desktop"><span>▧</span>Desktop</button>
            <button class="sidebar-item" data-finder-location="Documents"><span>▤</span>Documents</button>
            <button class="sidebar-item" data-finder-location="Downloads"><span>↓</span>Downloads</button>
            <button class="sidebar-item" data-finder-location="Applications"><span>✣</span>Applications</button>
          </aside>
          <section class="app-content finder-content">
            <div class="eyebrow">MY SPACE</div>
            <h2 id="finderHeading">Home</h2>
            <p class="muted">Ruang kerja personal kamu.</p>
            <div class="section-heading">Favorites</div>
            <div class="finder-files">
              <button class="card finder-file" data-open="notes"><span>📝</span><b>Notes</b><small>Catatan personal</small></button>
              <button class="card finder-file" data-open="settings"><span>⚙️</span><b>Settings</b><small>Preferensi desktop</small></button>
              <button class="card finder-file" data-open="calendar"><span>🗓️</span><b>Calendar</b><small>Waktu dan tanggal</small></button>
            </div>
            <p class="muted" style="margin-top:20px">Finder ini merupakan simulasi. File asli komputer tidak diubah.</p>
          </section>
        </div>`;

    case "notes":
      return `
        <div class="app-layout">
          <aside class="sidebar">
            <div class="card" style="padding:12px;margin-bottom:12px">
              <b style="font-size:12px">Quick Notes</b>
              <p class="muted" style="margin:6px 0 0">Tersimpan otomatis di browser ini.</p>
            </div>
            <button class="primary-button" id="newNote" style="width:100%">＋ New Note</button>
            <div class="sidebar-heading" style="margin-top:20px">Notes</div>
            <div id="notesList"></div>
          </aside>
          <section class="app-content">
            <input id="noteTitle" class="field" placeholder="Judul catatan" style="margin-bottom:12px">
            <textarea id="noteBody" class="field" placeholder="Mulai menulis..." style="height:calc(100% - 45px);resize:none"></textarea>
            <div class="muted" id="noteStatus" style="margin-top:8px">Semua perubahan tersimpan otomatis.</div>
          </section>
        </div>`;

    case "calculator":
      return `
        <div class="app-content calculator-app">
          <div class="calculator-display">
            <div id="calcExpression" class="muted"></div>
            <div id="calcResult">0</div>
          </div>
          <div class="calculator-keys">
            ${["AC","±","%","÷","7","8","9","×","4","5","6","−","1","2","3","+","⌫","0",".","="].map(key =>
              `<button class="calc-key ${["÷","×","−","+","="].includes(key) ? "operator" : ""} ${["AC","±","%","⌫"].includes(key) ? "function" : ""}" data-calc="${key}">${key}</button>`
            ).join("")}
          </div>
        </div>`;

    case "calendar":
      return `
        <div class="app-content">
          <div class="card-row">
            <div><div class="eyebrow">YOUR SCHEDULE</div><h2 id="calendarTitle"></h2></div>
            <div><button class="secondary-button" id="calendarPrev">‹</button> <button class="secondary-button" id="calendarNext">›</button></div>
          </div>
          <div class="calendar-grid" id="calendarGrid"></div>
          <div class="section-heading">Today</div>
          <div class="card"><b>${new Date().toLocaleDateString("id-ID", { weekday:"long", day:"numeric", month:"long" })}</b><p class="muted">Tidak ada acara terjadwal. Waktunya membuat rencana baru.</p></div>
        </div>`;

    case "settings":
      return `
        <div class="app-layout">
          <aside class="sidebar">
            <div class="sidebar-heading">System</div>
            <button class="sidebar-item active" data-setting-tab="appearance"><span>◐</span>Appearance</button>
            <button class="sidebar-item" data-setting-tab="wallpaper"><span>▧</span>Wallpaper</button>
            <button class="sidebar-item" data-setting-tab="desktop"><span>▦</span>Desktop</button>
            <button class="sidebar-item" data-setting-tab="accessibility"><span>◉</span>Accessibility</button>
            <button class="sidebar-item" data-setting-tab="about"><span>ⓘ</span>About</button>
          </aside>
          <section class="app-content" id="settingsContent"></section>
        </div>`;

    case "trash":
      return `
        <div class="app-content">
          <div class="eyebrow">RECENTLY DELETED</div>
          <h2>Trash</h2>
          <p class="muted">Tempat untuk item yang dibuang dari simulasi.</p>
          <div class="card" style="margin-top:22px;text-align:center;padding:35px 15px">
            <div style="font-size:38px">♲</div>
            <h3>Trash is Empty</h3>
            <p class="muted">Belum ada item di sini.</p>
          </div>
        </div>`;

    case "about":
      return `
        <div class="app-content" style="text-align:center;padding:32px">
          <div class="about-logo">A</div>
          <h2>Anip Desktop</h2>
          <p class="muted">Version 1.0 · Local-first desktop experience</p>
          <div class="card" style="margin-top:24px;text-align:left">
            <div class="card-row"><span class="muted">Platform</span><b>Browser simulation</b></div>
            <div class="card-row" style="margin-top:13px"><span class="muted">Storage</span><b>Local browser</b></div>
            <div class="card-row" style="margin-top:13px"><span class="muted">Framework</span><b>Vanilla HTML/CSS/JS</b></div>
          </div>
          <p class="muted" style="margin-top:18px">Designed for a quieter digital workspace.</p>
        </div>`;

    default:
      return `<div class="app-content"><h2>${escapeHTML(getApp(id)?.name || "Application")}</h2><p class="muted">Aplikasi belum tersedia.</p></div>`;
  }
}

function openApp(id) {
  const app = getApp(id);
  if (!app) return;

  closePanels();

  if (id === "launchpad") {
    showLaunchpad();
    return;
  }

  const existing = state.openWindows.get(id);
  if (existing && existing.isConnected) {
    focusWindow(existing);
    return;
  }

  const win = document.createElement("section");
  win.className = "window";
  win.dataset.app = id;
  win.setAttribute("aria-label", app.name);

  const width = Math.min(app.width, window.innerWidth - 24);
  const height = Math.min(app.height, window.innerHeight - 110);
  const offset = state.openWindows.size * 24;

  win.style.width = `${width}px`;
  win.style.height = `${height}px`;
  win.style.left = `${Math.max(8, (window.innerWidth - width) / 2 + offset % 90 - 35)}px`;
  win.style.top = `${Math.max(40, (window.innerHeight - height) / 2 - 18 + offset % 70)}px`;
  win.style.zIndex = ++state.zIndex;

  win.innerHTML = `
    <header class="window-titlebar">
      <div class="window-title">${escapeHTML(app.name)}</div>
      <div class="window-controls">
        <button type="button" class="minimize" data-window-action="minimize" aria-label="Minimize" title="Minimize">—</button>
        <button type="button" class="maximize" data-window-action="maximize" aria-label="Maximize" title="Maximize">□</button>
        <button type="button" class="close" data-window-action="close" aria-label="Close" title="Close">×</button>
      </div>
    </header>
    <div class="window-body">${getAppContent(id)}</div>
  `;

  layer.appendChild(win);
  state.openWindows.set(id, win);
  focusWindow(win);
  bindWindow(win, id);
  renderDockState();
}

function closeWindow(win) {
  const id = win.dataset.app;
  win.classList.add("closing");
  state.openWindows.delete(id);

  const dockApp = $(`.dock-app[data-open="${id}"]`);
  dockApp?.classList.remove("running");

  setTimeout(() => win.remove(), 190);
  if (state.activeWindow === win) state.activeWindow = null;
}

function bindWindow(win, id) {
  const titlebar = $(".window-titlebar", win);

  titlebar.addEventListener("pointerdown", event => {
    if (event.target.closest(".window-controls")) return;
    if (win.classList.contains("maximized")) return;
    if (event.button !== 0) return;

    focusWindow(win);
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = win.offsetLeft;
    const startTop = win.offsetTop;

    titlebar.setPointerCapture?.(event.pointerId);

    const move = moveEvent => {
      const left = startLeft + moveEvent.clientX - startX;
      const top = startTop + moveEvent.clientY - startY;
      win.style.left = `${Math.max(0, Math.min(window.innerWidth - 80, left))}px`;
      win.style.top = `${Math.max(34, Math.min(window.innerHeight - 80, top))}px`;
    };

    const end = () => {
      titlebar.removeEventListener("pointermove", move);
      titlebar.removeEventListener("pointerup", end);
      titlebar.removeEventListener("pointercancel", end);
    };

    titlebar.addEventListener("pointermove", move);
    titlebar.addEventListener("pointerup", end);
    titlebar.addEventListener("pointercancel", end);
  });

  win.addEventListener("pointerdown", () => focusWindow(win));

  if (id === "notes") bindNotes(win);
  if (id === "calculator") bindCalculator(win);
  if (id === "calendar") bindCalendar(win);
  if (id === "settings") bindSettings(win);
  if (id === "finder") bindFinder(win);

  renderDockState();
}

function renderDockState() {
  $$(".dock-app").forEach(button => {
    const id = button.dataset.open;
    button.classList.toggle("running", state.openWindows.has(id));
  });
}

/* Notes */

function saveNotes() {
  localStorage.setItem("anip-notes", JSON.stringify(state.notes));
}

function bindNotes(win) {
  let selectedId = state.notes[0]?.id || null;
  const list = $("#notesList", win);
  const title = $("#noteTitle", win);
  const body = $("#noteBody", win);
  const status = $("#noteStatus", win);

  function renderList() {
    list.innerHTML = state.notes.map(note => `
      <button class="sidebar-item ${note.id === selectedId ? "active" : ""}" data-note-id="${escapeHTML(note.id)}">
        <span>▤</span><span style="overflow:hidden;text-overflow:ellipsis">${escapeHTML(note.title || "Untitled")}</span>
      </button>
    `).join("");
  }

  function selectNote(id) {
    selectedId = id;
    const note = state.notes.find(item => item.id === id);
    title.value = note?.title || "";
    body.value = note?.body || "";
    renderList();
  }

  function persist() {
    const note = state.notes.find(item => item.id === selectedId);
    if (note) {
      note.title = title.value;
      note.body = body.value;
      note.updatedAt = Date.now();
      saveNotes();
      renderList();
      status.textContent = "Tersimpan · " + new Date().toLocaleTimeString("id-ID", {hour:"2-digit", minute:"2-digit"});
    }
  }

  $("#newNote", win).addEventListener("click", () => {
    const note = { id: crypto.randomUUID?.() || String(Date.now()), title: "", body: "", updatedAt: Date.now() };
    state.notes.unshift(note);
    saveNotes();
    selectNote(note.id);
    title.focus();
  });

  list.addEventListener("click", event => {
    const button = event.target.closest("[data-note-id]");
    if (button) selectNote(button.dataset.noteId);
  });

  title.addEventListener("input", persist);
  body.addEventListener("input", persist);

  if (!state.notes.length) {
    state.notes.push({ id: String(Date.now()), title: "Welcome to Notes", body: "Selamat datang di Anip Desktop.\n\nTulis ide, rencana, atau catatan kamu di sini.", updatedAt: Date.now() });
    saveNotes();
  }

  selectNote(selectedId || state.notes[0].id);
}

/* Calculator: safe arithmetic parser, without eval() */

function calculateExpression(source) {
  const input = source.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\s+/g, "");
  if (!input || !/^[0-9.+\-*/()%]+$/.test(input)) throw new Error("Invalid expression");

  let position = 0;
  const peek = () => input[position];
  const consume = () => input[position++];

  function primary() {
    if (peek() === "+") { consume(); return primary(); }
    if (peek() === "-") { consume(); return -primary(); }

    if (peek() === "(") {
      consume();
      const value = expression();
      if (consume() !== ")") throw new Error("Missing bracket");
      return value;
    }

    let number = "";
    while (/[0-9.]/.test(peek() || "") && position < input.length) number += consume();
    if (!number || number === "." || (number.match(/\./g) || []).length > 1) throw new Error("Invalid number");
    return Number(number);
  }

  function term() {
    let value = primary();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = consume();
      const next = primary();
      if (op === "*") value *= next;
      if (op === "/") value /= next;
      if (op === "%") value %= next;
    }
    return value;
  }

  function expression() {
    let value = term();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const next = term();
      value = op === "+" ? value + next : value - next;
    }
    return value;
  }

  const result = expression();
  if (position !== input.length || !Number.isFinite(result)) throw new Error("Invalid result");
  return Number(result.toPrecision(12));
}

function bindCalculator(win) {
  let expression = "";
  let result = "0";
  const expressionEl = $("#calcExpression", win);
  const resultEl = $("#calcResult", win);

  function render() {
    expressionEl.textContent = expression;
    resultEl.textContent = result;
  }

  win.addEventListener("click", event => {
    const key = event.target.closest("[data-calc]")?.dataset.calc;
    if (!key) return;

    if (key === "AC") {
      expression = "";
      result = "0";
    } else if (key === "⌫") {
      expression = expression.slice(0, -1);
    } else if (key === "=") {
      try {
        result = String(calculateExpression(expression));
        expression = result;
      } catch {
        result = "Error";
      }
    } else if (key === "±") {
      if (expression) expression = expression.startsWith("-") ? expression.slice(1) : "-" + expression;
    } else if (key === "%") {
      if (expression) {
        try {
          expression = String(calculateExpression(expression) / 100);
          result = expression;
        } catch {}
      }
    } else {
      const symbols = { "×": "*", "÷": "/", "−": "-" };
      expression += symbols[key] || key;
      try { result = String(calculateExpression(expression)); } catch {}
    }
    render();
  });
}

/* Calendar */

function bindCalendar(win) {
  let view = new Date();
  view.setDate(1);
  const title = $("#calendarTitle", win);
  const grid = $("#calendarGrid", win);

  function draw() {
    title.textContent = view.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const headings = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

    grid.innerHTML = headings.map(day => `<div class="calendar-weekday">${day}</div>`).join("");

    for (let i = 0; i < firstDay; i++) grid.insertAdjacentHTML("beforeend", `<div class="calendar-blank"></div>`);

    for (let day = 1; day <= count; day++) {
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      grid.insertAdjacentHTML("beforeend", `<button class="calendar-day ${isToday ? "today" : ""}" data-day="${day}">${day}</button>`);
    }
  }

  $("#calendarPrev", win).addEventListener("click", () => { view.setMonth(view.getMonth() - 1); draw(); });
  $("#calendarNext", win).addEventListener("click", () => { view.setMonth(view.getMonth() + 1); draw(); });
  grid.addEventListener("click", event => {
    const day = event.target.closest("[data-day]");
    if (day) notify(`Tanggal dipilih: ${day.dataset.day} ${view.toLocaleDateString("id-ID", {month:"long", year:"numeric"})}`, "▦");
  });
  draw();
}

/* Settings */

function bindSettings(win) {
  const content = $("#settingsContent", win);

  function showTab(tab) {
    $$(".sidebar-item", win).forEach(item => item.classList.toggle("active", item.dataset.settingTab === tab));

    if (tab === "appearance") {
      content.innerHTML = `
        <div class="eyebrow">PERSONALIZATION</div><h2>Appearance</h2><p class="muted">Sesuaikan suasana desktop kamu.</p>
        <div class="section-heading">Appearance mode</div>
        <div class="settings-options">
          <button class="card theme-option" data-theme="dark"><div class="theme-preview dark-preview"></div><b>Dark</b></button>
          <button class="card theme-option" data-theme="light"><div class="theme-preview light-preview"></div><b>Light</b></button>
          <button class="card theme-option" data-theme="system"><div class="theme-preview system-preview"></div><b>System</b></button>
        </div>
        <div class="section-heading">Motion</div>
        <div class="card card-row"><div><b>Reduce motion</b><p class="muted">Kurangi animasi antarmuka.</p></div><input type="checkbox" id="reduceMotion"></div>
      `;
      $("#reduceMotion", content).checked = document.body.classList.contains("reduce-motion");
    } else if (tab === "wallpaper") {
      content.innerHTML = `
        <div class="eyebrow">PERSONALIZATION</div><h2>Wallpaper</h2><p class="muted">Pilih nuansa untuk ruang kerja kamu.</p>
        <div class="wallpaper-options">
          <button class="wallpaper-choice wallpaper-one" data-wallpaper="one"><span>Violet Flow</span></button>
          <button class="wallpaper-choice wallpaper-two" data-wallpaper="two"><span>Ocean Glass</span></button>
          <button class="wallpaper-choice wallpaper-three" data-wallpaper="three"><span>Rose Quartz</span></button>
          <button class="wallpaper-choice wallpaper-four" data-wallpaper="four"><span>Midnight</span></button>
        </div>
        <div class="section-heading">Your own wallpaper</div>
        <label class="secondary-button" style="display:inline-flex;cursor:pointer">Choose image <input id="wallpaperUpload" type="file" accept="image/*" hidden></label>
        <p class="muted">Gambar pilihan disimpan di browser perangkat ini.</p>
        <button class="secondary-button" id="resetWallpaper">Reset wallpaper</button>
      `;
    } else if (tab === "desktop") {
      content.innerHTML = `
        <div class="eyebrow">WORKSPACE</div><h2>Desktop</h2><p class="muted">Pengaturan ruang kerja Anip.</p>
        <div class="card card-row"><div><b>Desktop icons</b><p class="muted">Tampilkan ikon aplikasi.</p></div><input id="iconsToggle" type="checkbox" checked></div>
        <div class="card card-row" style="margin-top:10px"><div><b>Show Dock</b><p class="muted">Tampilkan Dock di bawah layar.</p></div><input id="dockToggle" type="checkbox" checked></div>
        <div class="card card-row" style="margin-top:10px"><div><b>Animations</b><p class="muted">Aktifkan transisi antarmuka.</p></div><input id="motionToggle" type="checkbox" checked></div>
        <div class="section-heading">Display brightness</div><input id="settingsBrightness" type="range" min="65" max="115" value="${Math.round(parseFloat(desktop.style.getPropertyValue("--brightness") || "1") * 100)}">
      `;
      $("#iconsToggle", content).checked = !$(".desktop-icons").classList.contains("hidden");
      $("#dockToggle", content).checked = !$(".dock-wrap").classList.contains("hidden");
      $("#motionToggle", content).checked = !document.body.classList.contains("reduce-motion");
    } else if (tab === "accessibility") {
      content.innerHTML = `
        <div class="eyebrow">ACCESSIBILITY</div><h2>Accessibility</h2><p class="muted">Buat antarmuka lebih nyaman digunakan.</p>
        <div class="card card-row"><div><b>Reduce motion</b><p class="muted">Kurangi gerakan dan animasi.</p></div><input id="accessReduceMotion" type="checkbox"></div>
        <div class="card card-row" style="margin-top:10px"><div><b>High contrast</b><p class="muted">Tingkatkan kontras panel.</p></div><input id="highContrast" type="checkbox"></div>
        <p class="muted" style="margin-top:14px">Preferensi ini berlaku pada simulasi desktop ini.</p>
      `;
      $("#accessReduceMotion", content).checked = document.body.classList.contains("reduce-motion");
      $("#highContrast", content).checked = document.body.classList.contains("high-contrast");
    } else {
      content.innerHTML = `<div class="eyebrow">ABOUT</div><h2>Anip Desktop</h2><p class="muted">A calm desktop simulation built with web standards.</p><div class="card"><b>Version 1.0</b><p class="muted">Local-first · Responsive · Vanilla JavaScript</p></div><button class="primary-button" id="aboutButton" style="margin-top:12px">More information</button>`;
      $("#aboutButton", content).addEventListener("click", () => openApp("about"));
    }
  }

  win.addEventListener("click", event => {
    const tab = event.target.closest("[data-setting-tab]")?.dataset.settingTab;
    if (tab) showTab(tab);

    const theme = event.target.closest("[data-theme]")?.dataset.theme;
    if (theme) {
      setTheme(theme);
      showTab("appearance");
    }

    const wallpaper = event.target.closest("[data-wallpaper]")?.dataset.wallpaper;
    if (wallpaper) setWallpaper(wallpaper);

    if (event.target.id === "resetWallpaper") {
      localStorage.removeItem("anip-wallpaper");
      state.wallpaper = "";
      $(".wallpaper").style.background = "";
      $(".wallpaper").className = "wallpaper wallpaper-default";
      notify("Wallpaper dikembalikan ke default.");
    }
  });

  win.addEventListener("change", event => {
    const target = event.target;
    if (target.id === "reduceMotion" || target.id === "accessReduceMotion") {
      document.body.classList.toggle("reduce-motion", target.checked);
    }
    if (target.id === "highContrast") {
      document.body.classList.toggle("high-contrast", target.checked);
    }
    if (target.id === "wallpaperUpload" && target.files[0]) {
      const file = target.files[0];
      if (!file.type.startsWith("image/")) return notify("Pilih file gambar.");
      if (file.size > 5 * 1024 * 1024) return notify("Ukuran gambar maksimal 5 MB.");

      const reader = new FileReader();
      reader.onload = () => {
        state.wallpaper = reader.result;
        localStorage.setItem("anip-wallpaper", state.wallpaper);
        $(".wallpaper").style.background = `center / cover no-repeat url("${state.wallpaper}")`;
        $(".wallpaper").className = "wallpaper wallpaper-custom";
        notify("Wallpaper berhasil diganti.");
      };
      reader.readAsDataURL(file);
    }
    if (target.id === "iconsToggle") $(".desktop-icons").classList.toggle("hidden", !target.checked);
    if (target.id === "dockToggle") $(".dock-wrap").classList.toggle("hidden", !target.checked);
    if (target.id === "motionToggle") document.body.classList.toggle("reduce-motion", !target.checked);
    if (target.id === "settingsBrightness") desktop.style.setProperty("--brightness", String(Number(target.value) / 100));
  });

  showTab("appearance");
}

/* Finder */

function bindFinder(win) {
  win.addEventListener("click", event => {
    const location = event.target.closest("[data-finder-location]")?.dataset.finderLocation;
    if (!location) return;

    state.finderLocation = location;
    $("#finderHeading", win).textContent = location;
    $$(".sidebar-item", win).forEach(item => item.classList.toggle("active", item.dataset.finderLocation === location));

    if (location === "Applications") {
      $(".finder-content", win).innerHTML = `
        <div class="eyebrow">APPLICATIONS</div><h2>Applications</h2><p class="muted">Aplikasi di Anip Desktop.</p>
        <div class="finder-files">
          ${appDefinitions.filter(app => app.id !== "launchpad").map(app => `
            <button class="card finder-file" data-open="${app.id}">${makeAppIcon(app)}<b>${escapeHTML(app.name)}</b></button>
          `).join("")}
        </div>`;
    } else {
      $(".finder-content", win).innerHTML = `
        <div class="eyebrow">MY SPACE</div><h2 id="finderHeading">${escapeHTML(location)}</h2>
        <p class="muted">Ini adalah lokasi virtual dalam simulasi.</p>
        <div class="card" style="margin-top:20px"><b>${escapeHTML(location)}</b><p class="muted">Belum ada file di lokasi ini.</p></div>`;
    }
  });
}

/* Appearance and wallpaper */

function setTheme(theme) {
  state.dark = theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.body.classList.toggle("light-mode", !state.dark);
  localStorage.setItem("anip-dark", String(state.dark));
}

function setWallpaper(name) {
  const wallpaper = $(".wallpaper");
  wallpaper.className = `wallpaper wallpaper-${name}`;
  wallpaper.style.background = "";

  const backgrounds = {
    one: "radial-gradient(ellipse at 15% 20%, #e3a7d0, transparent 38%), radial-gradient(ellipse at 80% 15%, #9399f0, transparent 42%), radial-gradient(ellipse at 70% 90%, #377f9e, transparent 45%), linear-gradient(135deg,#34264f,#283c67)",
    two: "radial-gradient(ellipse at 15% 10%,#a6f0e5,transparent 35%),radial-gradient(ellipse at 85% 30%,#668bdc,transparent 40%),radial-gradient(ellipse at 50% 90%,#293d66,transparent 50%),linear-gradient(135deg,#172c48,#345b75)",
    three: "radial-gradient(ellipse at 20% 15%,#ffcadf,transparent 40%),radial-gradient(ellipse at 80% 20%,#e7c7ff,transparent 40%),radial-gradient(ellipse at 65% 90%,#b1b5ec,transparent 45%),linear-gradient(135deg,#664a7a,#403a70)",
    four: "radial-gradient(ellipse at 30% 20%,#505477,transparent 40%),radial-gradient(ellipse at 75% 75%,#283e5c,transparent 45%),linear-gradient(135deg,#10121f,#26283d)"
  };

  wallpaper.style.background = backgrounds[name] || "";
  state.wallpaper = name;
  localStorage.setItem("anip-wallpaper", name);
}

function restorePreferences() {
  setTheme(state.dark ? "dark" : "light");

  if (state.wallpaper && state.wallpaper.startsWith("data:image/")) {
    $(".wallpaper").style.background = `center / cover no-repeat url("${state.wallpaper}")`;
    $(".wallpaper").className = "wallpaper wallpaper-custom";
  } else if (state.wallpaper) {
    setWallpaper(state.wallpaper);
  }
}

/* Fullscreen */

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      notify("Mode fullscreen aktif.");
    } else {
      await document.exitFullscreen();
      notify("Kembali ke jendela browser.");
    }
  } catch {
    notify("Fullscreen tidak diizinkan browser ini.");
  }
}

/* Event delegation */


document.addEventListener("click", event => {
  // Desktop icon: double-click handler menangani pembukaan.
  // Dock: ditangani oleh event handler Dock tersendiri.
  const openButton = event.target.closest("[data-open]");
  if (openButton) {
    if (openButton.closest("#desktopIcons, #dock")) return;

    const id = openButton.dataset.open;
    if (id) openApp(id);
    return;
  }

  const dismiss = event.target.closest("[data-dismiss]")?.dataset.dismiss;
  if (dismiss) {
    $("#" + dismiss)?.classList.add("hidden");
    return;
  }

  const actionButton = event.target.closest("[data-window-action]");
  if (!actionButton) return;

  const win = actionButton.closest(".window");
  if (!win) return;

  const action = actionButton.dataset.windowAction;

  if (action === "close") {
    closeWindow(win);
    return;
  }

  if (action === "minimize") {
    win.classList.add("minimized");
    win.classList.remove("focused");
    if (state.activeWindow === win) state.activeWindow = null;
    return;
  }

  if (action === "maximize") {
    const wasMaximized = win.classList.contains("maximized");

    if (!wasMaximized) {
      win._previousGeometry = {
        left: win.style.left,
        top: win.style.top,
        width: win.style.width,
        height: win.style.height
      };
      win.classList.add("maximized");
    } else {
      win.classList.remove("maximized");
      if (win._previousGeometry) {
        Object.assign(win.style, win._previousGeometry);
      }
    }

    focusWindow(win);
  }
});


$("#appleMenu").addEventListener("click", () => openApp("about"));
$("#menuApp").addEventListener("click", () => openApp("about"));

$("#controlButton").addEventListener("click", () => {
  const panel = $("#controlPanel");
  const shouldOpen = panel.classList.contains("hidden");
  closePanels("controlPanel");
  panel.classList.toggle("hidden", !shouldOpen);
});

$("#notificationButton").addEventListener("click", () => {
  const panel = $("#notificationPanel");
  const shouldOpen = panel.classList.contains("hidden");
  closePanels("notificationPanel");
  panel.classList.toggle("hidden", !shouldOpen);
  renderNotifications();
});

$("#focusButton").addEventListener("click", () => {
  state.focus = !state.focus;
  document.body.classList.toggle("focus-mode", state.focus);
  notify(state.focus ? "Mode fokus aktif." : "Mode fokus dinonaktifkan.", "☾");
});

$("#darkToggle").addEventListener("click", () => {
  setTheme(state.dark ? "light" : "dark");
  $("#darkToggle").classList.toggle("selected", state.dark);
});

$("#focusToggle").addEventListener("click", () => $("#focusButton").click());

$("#wifiToggle").addEventListener("click", event => {
  const button = event.currentTarget;
  button.classList.toggle("selected");
  $("small", button).textContent = button.classList.contains("selected") ? "Terhubung" : "Nonaktif";
  notify("Wi-Fi simulasi diperbarui.");
});

$("#bluetoothToggle").addEventListener("click", event => {
  const button = event.currentTarget;
  button.classList.toggle("selected");
  $("small", button).textContent = button.classList.contains("selected") ? "Aktif" : "Nonaktif";
  notify("Bluetooth simulasi diperbarui.");
});

$("#brightnessRange").addEventListener("input", event => {
  desktop.style.setProperty("--brightness", String(Number(event.target.value) / 100));
});

$("#volumeRange").addEventListener("input", event => {
  notify(`Volume simulasi: ${event.target.value}%`, "♪");
});

$("#openSettings").addEventListener("click", () => openApp("settings"));

$("#clearNotifications").addEventListener("click", () => {
  state.notifications = [];
  renderNotifications();
  notify("Notifikasi dibersihkan.");
});

$("#appSearch").addEventListener("input", event => renderLaunchpad(event.target.value));

$("#launchpad").addEventListener("click", event => {
  if (event.target === launchpad) launchpad.classList.add("hidden");
});

$("#contextMenu").addEventListener("click", event => {
  const action = event.target.closest("[data-context]")?.dataset.context;
  if (!action) return;

  $("#contextMenu").classList.add("hidden");

  if (action === "fullscreen") toggleFullscreen();
  else openApp(action);
});

desktop.addEventListener("contextmenu", event => {
  if (event.target.closest(".window, button, input, textarea")) return;

  event.preventDefault();
  const menu = $("#contextMenu");
  menu.classList.remove("hidden");

  const width = 200;
  const height = 165;
  menu.style.left = `${Math.min(event.clientX, window.innerWidth - width - 8)}px`;
  menu.style.top = `${Math.min(event.clientY, window.innerHeight - height - 8)}px`;
});

document.addEventListener("pointerdown", event => {
  if (!event.target.closest(".floating-panel, #controlButton, #notificationButton")) {
    $("#controlPanel").classList.add("hidden");
    $("#notificationPanel").classList.add("hidden");
  }
});

document.addEventListener("keydown", event => {
  const typing = event.target.matches("input, textarea, select, [contenteditable='true']");
  const mod = event.ctrlKey || event.metaKey;

  if (event.key === "Escape") {
    launchpad.classList.add("hidden");
    $("#contextMenu").classList.add("hidden");
    $("#controlPanel").classList.add("hidden");
    $("#notificationPanel").classList.add("hidden");
  }

  if (mod && event.key.toLowerCase() === "k") {
    event.preventDefault();
    showLaunchpad();
  }

  if (mod && event.key.toLowerCase() === "w" && state.activeWindow) {
    event.preventDefault();
    closeWindow(state.activeWindow);
  }

  if (mod && event.key === ",") {
    event.preventDefault();
    openApp("settings");
  }

  if (event.key === "F11") {
    event.preventDefault();
    toggleFullscreen();
  }

  if (event.altKey && event.key === "F10") {
    const minimized = [...state.openWindows.values()].filter(win =>
      win.isConnected && win.classList.contains("minimized")
    );
    if (minimized.length) focusWindow(minimized[minimized.length - 1]);
  }

  if (!typing && event.key === " ") {
    // Spasi saja tidak melakukan apa pun di desktop.
  }
});

/* Dock, responsive placement, and boot */

function initializeDesktop() {
  updateClock();
  state.clockTimer = setInterval(updateClock, 15000);
  renderLaunchpad();
  restorePreferences();
  renderNotifications();

  // Pastikan panel tidak tertinggal di luar viewport saat resize.
  window.addEventListener("resize", () => {
    $$(".window:not(.maximized)", layer).forEach(win => {
      const maxLeft = Math.max(0, window.innerWidth - win.offsetWidth);
      const maxTop = Math.max(34, window.innerHeight - win.offsetHeight - 75);
      win.style.left = `${Math.max(0, Math.min(maxLeft, win.offsetLeft))}px`;
      win.style.top = `${Math.max(34, Math.min(maxTop, win.offsetTop))}px`;
    });
  });

  // Klik ganda title bar untuk maximize/restore.
  layer.addEventListener("dblclick", event => {
    if (event.target.closest(".window-controls")) return;
    const bar = event.target.closest(".window-titlebar");
    if (!bar) return;
    const maximize = $(".maximize", bar);
    maximize?.click();
  });

  // Klik ikon desktop dua kali untuk membuka aplikasi.
  let lastDesktopClick = { id: "", time: 0 };
  $("#desktopIcons").addEventListener("click", event => {
    const button = event.target.closest("[data-open]");
    if (!button) return;
    const now = Date.now();
    const id = button.dataset.open;

    $$(".desktop-icon").forEach(item => item.classList.remove("selected"));
    button.classList.add("selected");

    if (lastDesktopClick.id === id && now - lastDesktopClick.time < 450) {
      openApp(id);
    }
    lastDesktopClick = { id, time: now };
  });

  // Pilih aplikasi dengan klik tunggal Dock.
  $("#dock").addEventListener("click", event => {
    const button = event.target.closest("[data-open]");
    if (!button) return;
    const id = button.dataset.open;
    const win = state.openWindows.get(id);

    if (win && win.isConnected && !win.classList.contains("minimized") && win === state.activeWindow) {
      win.classList.add("minimized");
      state.activeWindow = null;
    } else {
      openApp(id);
    }
  });

  // Aplikasi pertama untuk menyambut pengguna.
  notify("Anip Desktop siap digunakan.", "✦");
}

initializeDesktop();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.info("Anip Desktop: offline support ready"))
      .catch(error => {
        console.warn("Anip Desktop: service worker gagal didaftarkan.", error);
      });
  });
}

/* Mac Desktop — Window Keyboard Shortcuts */
document.addEventListener("keydown", (event) => {
  const isShortcut = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();

  if (!isShortcut || key !== "m" || event.altKey) return;

  // Hindari mengganggu saat pengguna mengetik di kolom input.
  const typing = event.target.matches(
    "input, textarea, select, [contenteditable='true']"
  );

  if (typing) return;

  event.preventDefault();

  const windows = [...state.openWindows.values()].filter(
    (win) => win?.isConnected
  );

  // Ctrl/Cmd + M: minimalkan jendela aktif.
  if (!event.shiftKey) {
    const win = state.activeWindow;

    if (!win || !win.isConnected) return;

    win.classList.add("minimized");
    win.classList.remove("focused");
    state.activeWindow = null;

    // Fokuskan jendela lain yang masih terbuka.
    const nextWindow = windows
      .filter((item) => item !== win && !item.classList.contains("minimized"))
      .sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];

    if (nextWindow) focusWindow(nextWindow);
    return;
  }

  // Ctrl/Cmd + Shift + M: pulihkan jendela yang diminimalkan.
  const minimizedWindow = windows
    .filter((win) => win.classList.contains("minimized"))
    .sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];

  if (minimizedWindow) {
    focusWindow(minimizedWindow);
  } else {
    notify("Tidak ada jendela yang diminimalkan.", "⌘");
  }
});
