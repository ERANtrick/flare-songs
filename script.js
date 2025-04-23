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
    play: "曲再生スタート",
    link: "元配信リンク",
    unknown: "情報なし",
    all_streams: "すべての配信",
    all_categories: "すべて",
    fav_toggle_off: "★ お気に入りだけ表示",
    fav_toggle_on: "★ お気に入り表示中"
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
    play: "Play Song",
    link: "Original Stream",
    unknown: "No Info",
    all_streams: "All Streams",
    all_categories: "All",
    fav_toggle_off: "★ Favorites Only",
    fav_toggle_on: "★ Showing Favorites"
  }
};

let currentLang = "ja";

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS1O8_fE8vDDkvocXwcSIEAtF8eyxH-Jq_-6Wu09RCO1Y0AG7dfXYGsgjtJCCAqaJ37IX9YF23lZ3Ns/pub?output=csv';
let allSongs = [];
let allCategories = [];

const sessionSortOpts = [
  { value: 'date-desc', text: { ja: '配信日順（新しい順）', en: 'Newest First' }},
  { value: 'date-asc',  text: { ja: '配信日順（古い順）', en: 'Oldest First' }},
  { value: 'random',    text: { ja: 'ランダム', en: 'Random' }}
];

window.addEventListener("DOMContentLoaded", () => {
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    complete: ({ data }) => {
      allSongs = data;
      initModeSelect();
      initSessionSelect();
      initCategory();
      initSortSelect();
      initSearch();
      initFavoriteToggle();
      initReset();
      updateUILabels();
      applyView();
    }
  });

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
});

function updateUILabels() {
  document.querySelector("label[for='mode-select']").textContent = i18n[currentLang].mode;
  document.querySelector("label[for='session-select']").textContent = i18n[currentLang].session;
  document.querySelector("label[for='category-select']").textContent = i18n[currentLang].category;
  document.querySelector("label[for='sort-session']").textContent = i18n[currentLang].sort;
  document.querySelector("label[for='search-input']").textContent = i18n[currentLang].keyword;
  document.getElementById("search-input").placeholder = i18n[currentLang].keyword + "...";
  document.getElementById("reset-btn").textContent = i18n[currentLang].reset;

  const modeSelect = document.getElementById("mode-select");
  if (modeSelect) {
    modeSelect.options[0].textContent = i18n[currentLang].mode_session;
    modeSelect.options[1].textContent = i18n[currentLang].mode_song;
  }

  const favBtn = document.getElementById("fav-only-btn");
  if (favBtn) {
    favBtn.textContent = favOnlyMode
      ? i18n[currentLang].fav_toggle_on
      : i18n[currentLang].fav_toggle_off;
  }
}

function initModeSelect() {
  document.getElementById('mode-select').addEventListener('change', applyView);
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
  const arr = Object.entries(map).map(([url,o])=>({ url, label: o.label, date: o.date }))
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
    allSongs.filter(s => s['公開'] === '公開').map(s => s['Category']).filter(Boolean)
  )].sort();
  allCategories = cats;

  sel.innerHTML = `<option value="">${i18n[currentLang].all_categories}</option>`;
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', applyView);
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
  ss.addEventListener('change', applyView);
}

function initSearch() {
  document.getElementById('search-input').addEventListener('input', applyView);
}

function initReset() {
  document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('mode-select').value      = 'session';
    document.getElementById('session-select').value   = '';
    document.getElementById('category-select').value  = '';
    document.getElementById('sort-session').value     = sessionSortOpts[0].value;
    document.getElementById('search-input').value     = '';
    applyView();
  });
}

let favOnlyMode = false;

function initFavoriteToggle() {
  const btn = document.getElementById("fav-only-btn");
  btn.addEventListener("click", () => {
    favOnlyMode = !favOnlyMode;
    btn.classList.toggle("active");
    btn.classList.toggle("btn-warning");
    btn.classList.toggle("btn-outline-warning");
    updateUILabels(); // 言語に応じてボタンテキスト更新
    applyView();
  });
}

// ↓この下に render, createCardCol, getFavorites など続けてOKです（変更不要）




function applyView() {
  const mode         = document.getElementById('mode-select').value;
  const sessionVal   = document.getElementById('session-select').value;
  const categoryVal  = document.getElementById('category-select').value;
  const sortSession  = document.getElementById('sort-session').value;
  const kw           = document.getElementById('search-input').value.trim().toLowerCase();

  let list = allSongs.filter(s => s['公開'] === '公開');

  if (favOnlyMode) {
    const favs = getFavorites();
    list = list.filter(s => favs.includes(s['リンク'] || s['配信URL']));
  }

  if (sessionVal)  list = list.filter(s => s['配信URL'] === sessionVal);
  if (categoryVal) list = list.filter(s => s['Category'] === categoryVal);
  if (kw)          list = list.filter(s => (s['曲名']||'').toLowerCase().includes(kw));

  if (mode === 'session' && !kw) {
    renderBySession(list, sortSession);
  } else {
    renderGrouped(list);
  }
}


// ← この下に createCardCol(), renderBySession(), renderGrouped() を続けます

function getFavorites() {
  const raw = localStorage.getItem('favorites') || '[]';
  return JSON.parse(raw);
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
  const title     = song['曲名']||'（曲名なし）';
  const dateDisp  = song['配信日']||'';
  const sessTitle = song['配信タイトル']||'';
  const note      = song['備考']||'';
  const timeLink  = song['リンク']||'';
  const origLink  = song['配信URL']||'';
  const thumb     = song['ThumbnailURL']||'';

  const favKey = timeLink || origLink;
  const isFav = isFavorite(favKey);

  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-md-4';

  const card = document.createElement('div');
  card.className = 'card h-100 position-relative';

  if (thumb) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'card-img-wrapper';

    const img = document.createElement('img');
    img.src = thumb;
    img.alt = title;

    const btn = document.createElement('button');
    btn.className = 'fav-btn' + (isFav ? ' active' : '');
    btn.textContent = isFav ? '★' : '☆';
    btn.setAttribute('data-link', favKey);

    btn.addEventListener('click', () => {
      const nowFav = isFavorite(favKey);
      if (nowFav) {
        removeFavorite(favKey);
        btn.classList.remove('active');
        btn.textContent = '☆';
      } else {
        addFavorite(favKey);
        btn.classList.add('active');
        btn.textContent = '★';
      }
    });

    imgWrap.appendChild(btn);
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);
  }

  const body = document.createElement('div');
  body.className = 'card-body d-flex flex-column';

  const h5 = document.createElement('h5');
  h5.className = 'card-title';
  h5.textContent = title;

  const pMeta = document.createElement('p');
  pMeta.className = 'text-muted mb-2';
  pMeta.style.fontSize = '0.9rem';
  pMeta.textContent = `${dateDisp}${sessTitle ? ' ｜ ' + sessTitle : ''}`;

  const pNote = note ? document.createElement('p') : null;
  if (pNote) {
    pNote.className = 'text-muted mb-2';
    pNote.textContent = note;
  }

  const btnArea = document.createElement('div');
  btnArea.className = 'mt-auto d-flex gap-2';

  if (timeLink) {
    const a1 = document.createElement('a');
    a1.href = timeLink;
    a1.target = '_blank';
    a1.className = 'btn btn-primary flex-fill';
    a1.textContent = i18n[currentLang].play;
    btnArea.appendChild(a1);
  }
  if (origLink) {
    const a2 = document.createElement('a');
    a2.href = origLink;
    a2.target = '_blank';
    a2.className = 'btn btn-secondary flex-fill';
    a2.textContent = i18n[currentLang].link;
    btnArea.appendChild(a2);
  }
  if (!timeLink && !origLink) {
    const span = document.createElement('span');
    span.className = 'text-secondary';
    span.textContent = i18n[currentLang].unknown;
    btnArea.appendChild(span);
  }

  body.appendChild(h5);
  body.appendChild(pMeta);
  if (pNote) body.appendChild(pNote);
  body.appendChild(btnArea);

  card.appendChild(body);
  col.appendChild(card);
  return col;
}

function renderBySession(songs, sortSession) {
  const c = document.getElementById('song-list');
  c.innerHTML = '';
  c.classList.remove('accordion');

  const groups = songs.reduce((acc, s) => {
    const k = s['配信URL'];
    if (!acc[k]) {
      acc[k] = {
        date:  new Date(s['日付']),
        label: `${s['配信日']} ｜ ${s['配信タイトル']}`,
        items:[]
      };
    }
    acc[k].items.push(s);
    return acc;
  }, {});

  let arr = Object.values(groups);
  if (sortSession === 'random') {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  } else {
    arr.sort((a, b) =>
      sortSession === 'date-asc' ? a.date - b.date : b.date - a.date
    );
  }

  arr.forEach(sess => {
    const h5 = document.createElement('h5');
    h5.className = 'mt-4';
    h5.textContent = sess.label;
    c.appendChild(h5);

    const row = document.createElement('div');
    row.className = 'row g-3 mb-3';
    sess.items.sort((a, b) => Number(a['開始秒数']||0) - Number(b['開始秒数']||0))
      .forEach(s => row.appendChild(createCardCol(s)));
    c.appendChild(row);
  });
}

function renderGrouped(songs) {
  const c = document.getElementById('song-list');
  c.innerHTML = '';
  c.classList.add('accordion');
  const sortSession = document.getElementById('sort-session').value;

  const groups = songs.reduce((acc, s) => {
    const t = s['曲名'] || '（曲名なし）';
    (acc[t] ||= []).push(s);
    return acc;
  }, {});
  const groupArr = Object.entries(groups).map(([title, list]) => {
    if (sortSession === 'random') {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    } else {
      list.sort((a, b) => {
        const da = new Date(a['日付']), db = new Date(b['日付']);
        return sortSession === 'date-asc' ? da - db : db - da;
      });
    }
    const repDate = new Date(list[0]['日付']);
    return { title, list, repDate };
  });

  if (sortSession === 'random') {
    for (let i = groupArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [groupArr[i], groupArr[j]] = [groupArr[j], groupArr[i]];
    }
  } else {
    groupArr.sort((a, b) =>
      sortSession === 'date-asc'
        ? a.repDate - b.repDate
        : b.repDate - a.repDate
    );
  }

  groupArr.forEach(({ title, list }, i) => {
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
      <div id="collapse-${id}" class="accordion-collapse collapse" data-bs-parent="#song-list">
        <div class="accordion-body p-0">
          <div class="row g-3 m-3"></div>
        </div>
      </div>`;
    const bodyRow = item.querySelector('.row');
    list.forEach(s => bodyRow.appendChild(createCardCol(s)));
    c.appendChild(item);
  });
}
