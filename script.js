const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS1O8_fE8vDDkvocXwcSIEAtF8eyxH-Jq_-6Wu09RCO1Y0AG7dfXYGsgjtJCCAqaJ37IX9YF23lZ3Ns/pub?output=csv';

let allSongs       = [];
let currentSort    = 'date-desc';
let allCategories  = [];
let videoModal;
let subscribeToast;

window.addEventListener('DOMContentLoaded', () => {
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    complete: ({ data }) => {
      allSongs = data;
      initSession();
      initSort();
      initSearch();
      initReset();
      initCategory();
      applyView();

      // ── モーダル＆Toast セットアップ ─────────────────
      const modalEl = document.getElementById('videoModal');
      videoModal    = new bootstrap.Modal(modalEl);
      const toastEl       = document.getElementById('subscribeToast');
      subscribeToast     = new bootstrap.Toast(toastEl);

      // 再生ボタンをクリックしたら
      document.body.addEventListener('click', e => {
        const btn = e.target.closest('.play-btn');
        if (!btn) return;

        // データ属性からURL取得
        const originalUrl = btn.dataset.ytUrl;
        const tmpUrl      = new URL(btn.dataset.videoUrl);

        // ID・開始秒をパース
        const videoId   = tmpUrl.pathname.includes('youtu.be')
          ? tmpUrl.pathname.slice(1)
          : tmpUrl.searchParams.get('v');
        const startTime = tmpUrl.searchParams.get('t')
                       || tmpUrl.searchParams.get('start')
                       || '0';

        // 埋め込みURL（自動再生＋ミュート）
        const embedUrl = `https://www.youtube.com/embed/${videoId}`
               + `?start=${startTime}&autoplay=1&mute=1&rel=0`;

        // iframe を挿入
        modalEl.querySelector('.modal-body').innerHTML = `
          <iframe
            src="${embedUrl}"
            frameborder="0"
            allow="autoplay; encrypted-media"
            allowfullscreen
            style="position:absolute;top:0;left:0;width:100%;height:100%;"
          ></iframe>`;

        // YouTube サイトで開く先もセット
        document.getElementById('openOnYT').href = btn.dataset.videoUrl;

        videoModal.show();
      });

      // モーダルを閉じたら iframe をクリア＆Toast表示
      modalEl.addEventListener('hidden.bs.modal', () => {
        modalEl.querySelector('.modal-body').innerHTML = '';
        subscribeToast.show();
      });
      // ────────────────────────────────────────────────
    },
    error: err => console.error(err)
  });
});

// 以下、既存の init〜applyView/render 系関数をそのまま並べてください。

function initSession() {
  const sel = document.getElementById('session-select');
  const publicSongs = allSongs.filter(s => s['公開'] === '公開');
  const sessionsMap = publicSongs.reduce((acc, song) => {
    const url   = song['配信URL'];
    const label = `${song['日付']} ｜ ${song['配信タイトル']}`;
    const dt    = new Date(song['日付']);
    if (!acc[url] || dt > acc[url].date) {
      acc[url] = { date: dt, label };
    }
    return acc;
  }, {});
  const sessionsArr = Object.entries(sessionsMap)
    .map(([url, { date, label }]) => ({ url, date, label }))
    .sort((a, b) => b.date - a.date);

  sel.innerHTML = '<option value="">すべての配信</option>';
  sessionsArr.forEach(({ url, label }) => {
    const opt = document.createElement('option');
    opt.value       = url;
    opt.textContent = label;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    document.getElementById('search-input').value = '';
    applyView();
  });
}

function initSort() {
  document.getElementById('sort-select')
    .addEventListener('change', e => {
      currentSort = e.target.value;
      applyView();
    });
}

function initSearch() {
  document.getElementById('search-input')
    .addEventListener('input', applyView);
}

function initReset() {
  document.getElementById('reset-btn')
    .addEventListener('click', () => {
      document.getElementById('session-select').value = '';
      document.getElementById('sort-select').value    = 'date-desc';
      currentSort = 'date-desc';
      document.getElementById('search-input').value   = '';
      applyView();
    });
}

function initCategory() {
  const sel = document.getElementById('category-select');
  sel.innerHTML = '<option value="">すべて</option>';
  const cats = [...new Set(allSongs.map(s => s['Category']).filter(Boolean))];
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value       = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    applyView();
  });
}

function applyView() {
  currentSort = document.getElementById('sort-select').value;
  const sessionVal  = document.getElementById('session-select').value;
  const categoryVal = document.getElementById('category-select').value;
  const kw          = document.getElementById('search-input').value.trim().toLowerCase();
  const container   = document.getElementById('song-list');

  container.classList.toggle('session-view', !kw);

  let list = [...allSongs];
  list = list.filter(song => song['公開'] === '公開');
  if (sessionVal)  list = list.filter(s => s['配信URL'] === sessionVal);
  if (categoryVal) list = list.filter(s => s['Category'] === categoryVal);
  if (kw)          list = list.filter(s => (s['曲名']||'').toLowerCase().includes(kw));
  list = sortSongs(list);

  if (list.length === 0) {
    container.innerHTML = `
      <div class="alert alert-warning" role="alert">
        公開中のコンテンツがありません。
      </div>`;
    return;
  }

  if (kw) renderGrouped(list);
  else   renderBySession(list);
}

function sortSongs(songs) {
  if (currentSort === 'title') {
    return songs.sort((a, b) =>
      (a['曲名']||'').localeCompare(b['曲名']||'', 'ja')
    );
  }
  if (currentSort === 'random') {
    for (let i = songs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [songs[i], songs[j]] = [songs[j], songs[i]];
    }
    return songs;
  }
  return songs.sort((a, b) => {
    const da = new Date(a['日付']), db = new Date(b['日付']);
    return currentSort === 'date-asc' ? da - db : db - da;
  });
}

function renderBySession(songs) {
  const container = document.getElementById('song-list');
  container.innerHTML = '';
  const sessions = songs.reduce((acc, song) => {
    const key = song['配信URL'];
    if (!acc[key]) acc[key] = { date: song['配信日'], title: song['配信タイトル'], items: [] };
    acc[key].items.push(song);
    return acc;
  }, {});
  Object.values(sessions).forEach(sess => {
    const h = document.createElement('h5');
    h.className = 'mt-4';
    h.textContent = `${sess.date} ｜ ${sess.title}`;
    container.appendChild(h);
    const row = document.createElement('div');
    row.className = 'row g-3 mb-3';
    sess.items
      .sort((a, b) => (parseInt(a['開始秒数']||0) - parseInt(b['開始秒数']||0)))
      .forEach(song => row.appendChild(createCardCol(song)));
    container.appendChild(row);
  });
}

function renderGrouped(songs) {
  const container = document.getElementById('song-list');
  container.innerHTML = '';
  container.classList.add('accordion');
  const groups = songs.reduce((acc, song) => {
    const t = song['曲名']||'（曲名なし）';
    (acc[t]||(acc[t]=[])).push(song);
    return acc;
  }, {});
  Object.entries(groups).forEach(([title, list], idx) => {
    const safeId = `grp${idx}`;
    const item = document.createElement('div');
    item.className = 'accordion-item';
    const header = document.createElement('h2');
    header.className = 'accordion-header';
    header.id = `heading-${safeId}`;
    const btn = document.createElement('button');
    btn.className = 'accordion-button collapsed';
    btn.type = 'button';
    btn.setAttribute('data-bs-toggle', 'collapse');
    btn.setAttribute('data-bs-target', `#collapse-${safeId}`);
    btn.setAttribute('aria-controls', `collapse-${safeId}`);
    btn.textContent = `${title} （${list.length}件）`;
    header.appendChild(btn);
    item.appendChild(header);

    const collapseDiv = document.createElement('div');
    collapseDiv.id = `collapse-${safeId}`;
    collapseDiv.className = 'accordion-collapse collapse';
    collapseDiv.setAttribute('aria-labelledby', `heading-${safeId}`);
    collapseDiv.setAttribute('data-bs-parent', '#song-list');

    const body = document.createElement('div');
    body.className = 'accordion-body';
    const row = document.createElement('div');
    row.className = 'row g-3 mb-3';
    sortSongs(list).forEach(song => row.appendChild(createCardCol(song)));
    body.appendChild(row);
    collapseDiv.appendChild(body);
    item.appendChild(collapseDiv);
    container.appendChild(item);
  });
}

function createCardCol(song) {
  const title        = song['曲名'] || '（曲名なし）';
  const date         = song['日付'] || '';
  const sessionTitle = song['配信タイトル'] || '';
  const note         = song['備考'] || '';
  const timeLink     = song['リンク'] || '';
  const origLink     = song['配信URL'] || '';
  const thumbUrl     = song['ThumbnailURL'] || '';

  const imgWrapper = thumbUrl
    ? `<div class="card-img-wrapper">
         <img src="${thumbUrl}" alt="${title} thumbnail">
       </div>`
    : '';

  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-md-4';
  col.innerHTML = `
    <div class="card h-100">
      ${imgWrapper}
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${title}</h5>
        <p class="text-muted mb-2" style="font-size:0.9rem">
          ${date}${sessionTitle ? ' ｜ ' + sessionTitle : ''}
        </p>
        ${note ? `<p class="text-muted mb-2">${note}</p>` : ''}
        <div class="mt-auto d-flex gap-2">
          ${timeLink
            ? `<button
                 type="button"
                 class="btn btn-primary flex-fill play-btn"
                 data-video-url="${timeLink}"
                 data-yt-url="${origLink}"
               >
                 曲再生スタート
               </button>`
            : ''
          }
          ${origLink
            ? `<a href="${origLink}" target="_blank" class="btn btn-secondary flex-fill">
                 元配信リンク
               </a>`
            : ''
          }
          ${!timeLink && !origLink
            ? `<span class="text-secondary">情報なし</span>`
            : ''
          }
        </div>
      </div>
    </div>
  `;
  return col;
}