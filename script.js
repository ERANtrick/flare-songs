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
    all_categories: "すべて"
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
    all_categories: "All"
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
      initSortSelect(); // 並び替えオプション再生成
      initSessionSelect(); // 配信選択再生成
      initCategory(); // カテゴリ再生成
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
}

function initModeSelect() {
  document.getElementById('mode-select')
    .addEventListener('change', applyView);
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
  document.getElementById('search-input')
    .addEventListener('input', applyView);
}

function initReset() {
  document.getElementById('reset-btn')
    .addEventListener('click', () => {
      document.getElementById('mode-select').value      = 'session';
      document.getElementById('session-select').value   = '';
      document.getElementById('category-select').value  = '';
      document.getElementById('sort-session').value     = sessionSortOpts[0].value;
      document.getElementById('search-input').value     = '';
      applyView();
    });
}

function applyView() {
  const mode         = document.getElementById('mode-select').value;
  const sessionVal   = document.getElementById('session-select').value;
  const categoryVal  = document.getElementById('category-select').value;
  const sortSession  = document.getElementById('sort-session').value;
  const kw           = document.getElementById('search-input').value.trim().toLowerCase();

  let list = allSongs.filter(s => s['公開'] === '公開');
  if (sessionVal)  list = list.filter(s => s['配信URL'] === sessionVal);
  if (categoryVal) list = list.filter(s => s['Category'] === categoryVal);
  if (kw)          list = list.filter(s => (s['曲名']||'').toLowerCase().includes(kw));

  if (mode === 'session' && !kw) {
    renderBySession(list, sortSession);
  } else {
    renderGrouped(list);
  }
}

function renderBySession(songs, sortSession) {
  const c = document.getElementById('song-list');
  c.innerHTML = '';
  c.classList.remove('accordion');

  const groups = songs.reduce((acc, s) => {
    const k = s['配信URL'];
    if (!acc[k]) {
      acc[k] = {
        date: new Date(s['日付']),
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
    sess.items
      .sort((a, b) => Number(a['開始秒数']||0) - Number(b['開始秒数']||0))
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
      list.sort((a, b) => new Date(a['日付']) - new Date(b['日付']));
      if (sortSession === 'date-desc') list.reverse();
    }
    const repDate = new Date(list[0]['日付']);
    return { title, list, repDate };
  });

  if (sortSession !== 'random') {
    groupArr.sort((a, b) => sortSession === 'date-asc' ? a.repDate - b.repDate : b.repDate - a.repDate);
  }

  groupArr.forEach(({ title, list }, i) => {
    const id = `grp${i}`;
    const label = `${title} (${list.length} ${currentLang === 'ja' ? '件' : 'items'})`;
    const item = document.createElement('div');
    item.className = 'accordion-item';
    item.innerHTML = `
      <h2 class="accordion-header" id="heading-${id}">
        <button class="accordion-button collapsed" type="button"
                data-bs-toggle="collapse" data-bs-target="#collapse-${id}"
                aria-expanded="false" aria-controls="collapse-${id}">
          ${label}
        </button>
      </h2>
      <div id="collapse-${id}" class="accordion-collapse collapse"
           data-bs-parent="#song-list">
        <div class="accordion-body p-0">
          <div class="row g-3 m-3">
            ${list.map(s => createCardCol(s).outerHTML).join('')}
          </div>
        </div>
      </div>`;
    c.appendChild(item);
  });
}

function createCardCol(song) {
  const title = song['曲名'] || '（曲名なし）';
  const dateDisp = song['配信日'] || '';
  const sessTitle = song['配信タイトル'] || '';
  const note = song['備考'] || '';
  const timeLink = song['リンク'] || '';
  const origLink = song['配信URL'] || '';
  const thumb = song['ThumbnailURL'] || '';

  const imgWrap = thumb
    ? `<div class="card-img-wrapper"><img src="${thumb}" alt="${title}"></div>` : '';
  const playBtn = timeLink
    ? `<a href="${timeLink}" target="_blank" class="btn btn-primary flex-fill">${i18n[currentLang].play}</a>` : '';
  const origBtn = origLink
    ? `<a href="${origLink}" target="_blank" class="btn btn-secondary flex-fill">${i18n[currentLang].link}</a>` : '';
  const noteHtml = note
    ? `<p class="text-muted mb-2">${note}</p>` : '';

  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-md-4';
  col.innerHTML = `
    <div class="card h-100">
      ${imgWrap}
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${title}</h5>
        <p class="text-muted mb-2" style="font-size:0.9rem">
          ${dateDisp}${sessTitle ? ' ｜ ' + sessTitle : ''}
        </p>
        ${noteHtml}
        <div class="mt-auto d-flex gap-2">
          ${playBtn}${origBtn}
          ${!playBtn && !origBtn ? '<span class="text-secondary">' + i18n[currentLang].unknown + '</span>' : ''}
        </div>
      </div>
    </div>`;
  return col;
}
