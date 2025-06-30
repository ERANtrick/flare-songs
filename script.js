const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS1O8_fE8vDDkvocXwcSIEAtF8eyxH-Jq_-6Wu09RCO1Y0AG7dfXYGsgjtJCCAqaJ37IX9YF23lZ3Ns/pub?output=csv';

const i18n = {
  ja: {
    mode: "表示モード",
    mode_session: "配信枠一覧 | Stream Sessions",
    mode_song: "曲名一覧 | Song List",
    session: "配信を選択",
    category: "カテゴリ",
    sort: "配信枠並び替え",
    keyword: "曲名で絞り込み",
    reset: "リセット",
    language: "言語",
    play: "曲再生スタート",
    link: "元配信リンク",
    unknown: "情報なし",
    all_streams: "すべての配信",
    all_categories: "すべて",
    fav_toggle_off: "★ お気に入りだけ表示",
    fav_toggle_on: "★ お気に入り表示中",
    loading: "読み込み中...",
    no_result: "該当曲がありません",
  },
  en: {
    mode: "Display Mode",
    mode_session: "Stream Sessions",
    mode_song: "Song List",
    session: "Select Stream",
    category: "Category",
    sort: "Sort by",
    keyword: "Filter by keyword",
    reset: "Reset",
    language: "Language",
    play: "Play Song",
    link: "Original Stream",
    unknown: "No Info",
    all_streams: "All Streams",
    all_categories: "All",
    fav_toggle_off: "★ Favorites Only",
    fav_toggle_on: "★ Showing Favorites",
    loading: "Loading...",
    no_result: "No matching songs found",
  }
};

const categoryTranslations = {
  "3Dライブ":      { ja: "3Dライブ", en: "3D Live" },
  "3D配信":        { ja: "3D配信", en: "3D Stream" },
  "オリジナルMV":  { ja: "オリジナルMV", en: "Original MV" },
  "カバー曲":      { ja: "カバー曲", en: "Cover Song" },
  "歌枠":          { ja: "歌枠", en: "Singing Stream" },
  "歌枠(コラボ)":  { ja: "歌枠(コラボ)", en: "Collab Singing" }
};

let currentLang = 'ja';
let allSongs = [];
let allCategories = [];
let favOnlyMode = false;

const sessionSortOpts = [
  { value: 'date-desc', text: { ja: '配信日順（新しい順）', en: 'Newest First' }},
  { value: 'date-asc',  text: { ja: '配信日順（古い順）', en: 'Oldest First' }},
  { value: 'random',    text: { ja: 'ランダム', en: 'Random' }}
];

function showSpinner() {
  const c = document.getElementById('song-list');
  c.innerHTML = `<div class="text-center my-5"><div class="spinner-border" role="status"></div><p class="mt-2">${i18n[currentLang].loading}</p></div>`;
}

function initLanguageToggle() {
  const langSelect = document.getElementById("lang-select");
  if (langSelect) {
    langSelect.addEventListener("change", (e) => {
      currentLang = e.target.value;
      updateUILabels();
      initSortSelect();
      initSessionSelect();
      initCategory();
      applyView();
    });
  }
}

function initDarkmodeToggle() {
  document.documentElement.getAttribute('data-bs-theme') === 'auto' && document.documentElement.setAttribute('data-bs-theme',window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const darkMode = document.getElementById("dark-mode-btn");
  if (darkMode) {
    darkMode.addEventListener("click",(e)=>{
      e.preventDefault();
      document.documentElement.setAttribute('data-bs-theme',document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark');
    }
  }
}

function updateUILabels() {
  const t = i18n[currentLang];
  document.querySelector("label[for='mode-select']").textContent = t.mode;
  document.querySelector("label[for='session-select']").textContent = t.session;
  document.querySelector("label[for='category-select']").textContent = t.category;
  document.querySelector("label[for='sort-session']").textContent = t.sort;
  document.querySelector("label[for='search-input']").textContent = t.keyword;
  document.getElementById("search-input").placeholder = t.keyword + "...";
  document.getElementById("reset-btn").textContent = t.reset;
  document.getElementById("mode-select").options[0].textContent = t.mode_session;
  document.getElementById("mode-select").options[1].textContent = t.mode_song;
  document.getElementById("lang-label").textContent = t.language;

  // お気に入りボタンの表示内容とクラスの統一（ここを追加）
  const favBtn = document.getElementById("fav-only-btn");
  favBtn.textContent = favOnlyMode ? t.fav_toggle_on : t.fav_toggle_off;

  favBtn.classList.toggle("active", favOnlyMode);
  favBtn.classList.toggle("btn-warning", favOnlyMode);
  favBtn.classList.toggle("btn-outline-warning", !favOnlyMode);
}


function getFavorites() {
  return JSON.parse(localStorage.getItem('favorites') || '[]');
}
function addFavorite(link) {
  const favs = getFavorites();
  if (!favs.includes(link)) {
    favs.push(link);
    localStorage.setItem('favorites', JSON.stringify(favs));
  }
}
function removeFavorite(link) {
  const favs = getFavorites().filter(f => f !== link);
  localStorage.setItem('favorites', JSON.stringify(favs));
}
function isFavorite(link) {
  return getFavorites().includes(link);
}

function createCardCol(song) {
  const title = song['曲名'] || '（曲名なし）';
  const date  = song['配信日'] || '';
  const sess  = song['配信タイトル'] || '';
  const note  = song['備考'] || '';
  const link  = song['リンク'] || '';
  const url   = song['配信URL'] || '';
  const img   = song['ThumbnailURL'] || '';
  const key   = link || url;
  const fav   = isFavorite(key);

  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-md-4';

  const html = `
    <div class="card h-100 position-relative">
      ${img ? `<div class="card-img-wrapper">
        <button class="fav-btn ${fav ? 'active' : ''}" data-link="${key}">${fav ? '★' : '☆'}</button>
        <img src="${img}" alt="${title}" loading="lazy"></div>` : ''}
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${title}</h5>
        <p class="text-muted mb-2" style="font-size:0.9rem">${date}${sess ? ' ｜ ' + sess : ''}</p>
        ${note ? `<p class="text-muted mb-2">${note}</p>` : ''}
        <div class="mt-auto d-flex gap-2">
          ${link ? `<a href="${link}" class="btn btn-primary flex-fill" target="_blank" data-track="play">${i18n[currentLang].play}</a>` : ''}
          ${url  ? `<a href="${url}" class="btn btn-secondary flex-fill" target="_blank" data-track="orig">${i18n[currentLang].link}</a>` : ''}
          ${!link && !url ? `<span class="text-secondary">${i18n[currentLang].unknown}</span>` : ''}
        </div>
      </div>
    </div>`;
  col.innerHTML = html;

// お気に入りボタン
const favBtn = col.querySelector('.fav-btn');
if (favBtn) {
  favBtn.addEventListener('click', () => {
    const link = favBtn.dataset.link;
    const isFav = isFavorite(link);
    const eventName = isFav ? 'click_fav_remove' : 'click_fav_add';

    if (isFav) {
      removeFavorite(link);
      favBtn.classList.remove('active');
      favBtn.textContent = '☆';
    } else {
      addFavorite(link);
      favBtn.classList.add('active');
      favBtn.textContent = '★';
    }

    // GAイベント送信
    if (typeof gtag === 'function') {
      gtag('event', eventName, {
        event_category: 'Favorite',
        event_label: song['曲名'] || '（曲名なし）',
        session_title: song['配信タイトル'] || '',
        link_url: link
      });
    }
  });
}


  // GAイベント送信
  const playBtn = col.querySelector('[data-track="play"]');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (typeof gtag === 'function') {
        gtag('event', 'click_play', {
          event_category: 'Song',
          event_label: title,
          session_title: sess,
          link_url: link
        });
      }
    });
  }

  const origBtn = col.querySelector('[data-track="orig"]');
  if (origBtn) {
    origBtn.addEventListener('click', () => {
      if (typeof gtag === 'function') {
        gtag('event', 'click_orig', {
          event_category: 'Stream',
          event_label: title,
          session_title: sess,
          link_url: url
        });
      }
    });
  }

  return col;
}


function renderBySession(songs, sortKey) {
  const c = document.getElementById('song-list');
  c.classList.remove('accordion');
  c.innerHTML = '';

  const sessionMap = new Map();
  for (const s of songs) {
    const url = s['配信URL'];
    if (!sessionMap.has(url)) {
      sessionMap.set(url, {
        label: `${s['配信日']} ｜ ${s['配信タイトル']}`,
        date: new Date(s['日付']),
        items: []
      });
    }
    sessionMap.get(url).items.push(s);
  }

  const sessions = [...sessionMap.values()];
  if (sortKey === 'random') sessions.sort(() => Math.random() - 0.5);
  else sessions.sort((a, b) =>
    sortKey === 'date-asc' ? a.date - b.date : b.date - a.date
  );

  const fragment = document.createDocumentFragment();

  sessions.forEach(sess => {
    const h = document.createElement('h5');
    h.className = 'mt-4';
    h.textContent = sess.label;
    fragment.appendChild(h);

    const row = document.createElement('div');
    row.className = 'row g-3 mb-3';
    sess.items.sort((a, b) =>
      (Number(a['開始秒数']) || 0) - (Number(b['開始秒数']) || 0)
    );
    sess.items.forEach(song => row.appendChild(createCardCol(song)));
    fragment.appendChild(row);
  });

  c.appendChild(fragment);
}

function renderGrouped(songs) {
  const c = document.getElementById('song-list');
  c.classList.add('accordion');
  c.innerHTML = '';

  const sortKey = document.getElementById('sort-session').value;
  const groupMap = new Map();

  for (const s of songs) {
    const t = s['曲名'] || '（曲名なし）';
    if (!groupMap.has(t)) groupMap.set(t, []);
    groupMap.get(t).push(s);
  }

  const groups = [...groupMap.entries()].map(([title, list]) => {
    list.sort((a, b) => new Date(a['日付']) - new Date(b['日付']));
    if (sortKey === 'date-desc') list.reverse();
    if (sortKey === 'random') list.sort(() => Math.random() - 0.5);
    return { title, list, repDate: new Date(list[0]['日付']) };
  });

  if (sortKey !== 'random') {
    groups.sort((a, b) =>
      sortKey === 'date-asc' ? a.repDate - b.repDate : b.repDate - a.repDate
    );
  }

  const fragment = document.createDocumentFragment();
  groups.forEach(({ title, list }, i) => {
    const id = `grp${i}`;
    const item = document.createElement('div');
    item.className = 'accordion-item';
    item.innerHTML = `
      <h2 class="accordion-header" id="heading-${id}">
        <button class="accordion-button collapsed" type="button"
          data-bs-toggle="collapse" data-bs-target="#collapse-${id}"
          aria-expanded="false" aria-controls="collapse-${id}">
          ${title} （${list.length}件）
        </button>
      </h2>
      <div id="collapse-${id}" class="accordion-collapse collapse"
        data-bs-parent="#song-list">
        <div class="accordion-body p-0"><div class="row g-3 m-3"></div></div>
      </div>`;
    const row = item.querySelector('.row');
    list.forEach(song => row.appendChild(createCardCol(song)));
    fragment.appendChild(item);
  });

  c.appendChild(fragment);
}

function applyView() {
  showSpinner();

  setTimeout(() => {
    const mode = document.getElementById('mode-select').value;
    const session = document.getElementById('session-select').value;
    const category = document.getElementById('category-select').value;
    const sort = document.getElementById('sort-session').value;
    const kw = document.getElementById('search-input').value.trim().toLowerCase();

    let list = allSongs.filter(s => s['公開'] === '公開');

    if (favOnlyMode) {
      const favs = getFavorites();
      list = list.filter(s => favs.includes(s['リンク'] || s['配信URL']));
    }

    if (session) list = list.filter(s => s['配信URL'] === session);
    if (category) list = list.filter(s => s['Category'] === category);
    if (kw) list = list.filter(s => (s['曲名'] || '').toLowerCase().includes(kw));

    if (list.length === 0) {
      const c = document.getElementById('song-list');
      c.classList.remove('accordion');
      c.innerHTML = `<div class="text-center my-5 text-muted">${i18n[currentLang].no_result || '該当曲がありません'}</div>`;
      return;
    }

    if (mode === 'session' && !kw) renderBySession(list, sort);
    else renderGrouped(list);
  }, 100);
}

function initUI() {
  document.getElementById('mode-select').addEventListener('change', (e) => {
    const selectedMode = e.target.value;
  
    // GAイベント送信
    if (typeof gtag === 'function') {
      gtag('event', 'change_mode', {
        event_category: 'UI',
        event_label: selectedMode // "session" または "song"
      });
    }
  
    applyView();
  });
  
  document.getElementById('search-input').addEventListener('input', applyView);
  document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('mode-select').value = 'session';
    document.getElementById('session-select').value = '';
    document.getElementById('category-select').value = '';
    document.getElementById('sort-session').value = sessionSortOpts[0].value;
    document.getElementById('search-input').value = '';
    favOnlyMode = false;
    updateUILabels();
    applyView();
  });

  document.getElementById("fav-only-btn").addEventListener("click", () => {
    favOnlyMode = !favOnlyMode;
    const btn = document.getElementById("fav-only-btn");
    btn.classList.toggle("active");
    btn.classList.toggle("btn-warning");
    btn.classList.toggle("btn-outline-warning");
    updateUILabels();
    applyView();
  });
}

function initSessionSelect() {
  const sel = document.getElementById('session-select');
  const map = allSongs.reduce((acc, s) => {
    if (s['公開'] !== '公開') return acc;
    const key = s['配信URL'];
    const dt  = new Date(s['日付']);
    if (!acc[key] || dt > acc[key].date) {
      acc[key] = { date: dt, label: `${s['配信日']} ｜ ${s['配信タイトル']}` };
    }
    return acc;
  }, {});
  const arr = Object.entries(map)
    .map(([url,o])=>({ url, label: o.label, date: o.date }))
    .sort((a,b)=> b.date - a.date);

  sel.innerHTML = `<option value="">${i18n[currentLang].all_streams}</option>`;
  arr.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.url;
    opt.textContent = o.label;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', applyView);
}

function initCategory() {
  const sel = document.getElementById('category-select');
  const cats = [...new Set(
    allSongs.filter(s => s['公開'] === '公開')
            .map(s => s['Category'])
            .filter(Boolean)
  )].sort();
  allCategories = cats;

  sel.innerHTML = `<option value="">${i18n[currentLang].all_categories}</option>`;
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = categoryTranslations[cat]?.[currentLang] || cat;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', (e) => {
    const selectedCategory = e.target.value;

    // GAイベント送信
    if (typeof gtag === 'function') {
      gtag('event', 'change_category', {
        event_category: 'UI',
        event_label: selectedCategory || 'All'
      });
    }

    applyView();
  });
}



function initSortSelect() {
  const ss = document.getElementById('sort-session');
  ss.innerHTML = '';
  sessionSortOpts.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.text[currentLang];
    ss.appendChild(opt);
  });
  ss.value = sessionSortOpts[0].value;

  ss.addEventListener('change', (e) => {
    const selectedSort = e.target.value;

    // GAイベント送信
    if (typeof gtag === 'function') {
      gtag('event', 'change_sort', {
        event_category: 'UI',
        event_label: selectedSort
      });
    }

    applyView();
  });
}

window.addEventListener("DOMContentLoaded", () => {
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    complete: ({ data }) => {
      allSongs = data;
      initLanguageToggle();
      initDarkModeToggle();
      initSortSelect();
      initSessionSelect();
      initCategory();
      initUI();
      updateUILabels();
      applyView();
    }
  });
});
