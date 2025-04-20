// script.js

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS1O8_fE8vDDkvocXwcSIEAtF8eyxH-Jq_-6Wu09RCO1Y0AG7dfXYGsgjtJCCAqaJ37IX9YF23lZ3Ns/pub?output=csv';

let allSongs = [];
let currentSort = 'date-desc';
let allCategories = [];  // 後でユニークカテゴリを保持

window.addEventListener('DOMContentLoaded', () => {
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    complete: ({ data }) => {
      allSongs = data;
      initSession();  // 配信セッション選択肢作成
      initSort();     // 並び替えリスナー
      initSearch();   // 検索リスナー
      initReset();    // リセットリスナー
      initCategory();  // カテゴリ
      applyView();    // 初期表示
    },
    error: err => console.error(err)
  });
});

/**
 * 配信セッション選択肢を
 * 「日付」列を使って新しい順に並べて生成する initSession()
 */
function initSession() {
    const sel = document.getElementById('session-select');
  
    // 1) URL ごとに最新の日付とラベルを保持するマップを作成
    const sessionsMap = allSongs.reduce((acc, song) => {
      const url   = song['配信URL'];
      const dateStr = song['日付']; // 例："2020/6/2"
      const label = `${song['日付']} ｜ ${song['配信タイトル']}`;
      const dt    = new Date(dateStr);  // YYYY/M/D 形式ならこれでOK
      // マップにない or より新しい日付なら更新
      if (!acc[url] || dt > acc[url].date) {
        acc[url] = { date: dt, label };
      }
      return acc;
    }, {});
  
    // 2) 配列に変換して、date 降順（新しい順）にソート
    const sessionsArr = Object.entries(sessionsMap)
      .map(([url, { date, label }]) => ({ url, date, label }))
      .sort((a, b) => b.date - a.date);
  
    // 3) ドロップダウンをクリアして<option>を追加
    sel.innerHTML = '<option value="">すべての配信</option>';
    sessionsArr.forEach(({ url, label }) => {
      const opt = document.createElement('option');
      opt.value       = url;
      opt.textContent = label;
      sel.appendChild(opt);
    });
  
    // 4) 選択時のリスナーはそのまま
    sel.addEventListener('change', () => {
      document.getElementById('search-input').value = '';
      applyView();
    });
  }

function initSort() {
  const sel = document.getElementById('sort-select');
  sel.addEventListener('change', () => {
    currentSort = sel.value;
    applyView();
  });
}

function initSearch() {
  const input = document.getElementById('search-input');
  input.addEventListener('input', () => {
    applyView();
  });
}

function initReset() {
  const btn = document.getElementById('reset-btn');
  btn.addEventListener('click', () => {
    document.getElementById('session-select').value = '';
    document.getElementById('sort-select').value    = 'date-desc';
    currentSort = 'date-desc';
    document.getElementById('search-input').value   = '';
    applyView();
  });
}

function initCategory() {
    const sel = document.getElementById('category-select');
    // 1) 全データから Category を抽出・ユニーク化
    const cats = [...new Set(allSongs.map(s => s['Category']).filter(Boolean))];
    allCategories = cats;
    // 2) <option> を追加
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value       = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    });
    // 3) 選択時に画面更新
    sel.addEventListener('change', () => {
      applyView();
    });
  }



/**
 * 画面の状態（セッション選択／検索キーワード／ソート）に応じてビューを更新
 */
function applyView() {
    // ① 並び替えセレクトの状態を反映
    currentSort = document.getElementById('sort-select').value;
  
    // ② 各入力値を取得
    const sessionVal  = document.getElementById('session-select').value;
    const categoryVal = document.getElementById('category-select').value;
    const kw          = document.getElementById('search-input').value.trim().toLowerCase();
  
    // ── モード判定 & class 切り替え ─────────────────
    const container = document.getElementById('song-list');
    if (!kw) {
      // 検索キーワードなし＝一覧モード（セッション表示）
      container.classList.add('session-view');
    } else {
      // キーワードあり＝グループ（アコーディオン）モード
      container.classList.remove('session-view');
    }
    // ────────────────────────────────────────────────
  
    // ③ 全データをコピーしてフィルタ開始
    let list = [...allSongs];
    if (sessionVal)  list = list.filter(s => s['配信URL'] === sessionVal);
    if (categoryVal) list = list.filter(s => s['Category'] === categoryVal);
    if (kw)          list = list.filter(s => (s['曲名']||'').toLowerCase().includes(kw));
  
    // ④ ソート適用
    list = sortSongs(list);
  
    // ⑤ 表示切り替え
    if (kw) {
      renderGrouped(list);
    } else {
      renderBySession(list);
    }
  }


/**
 * currentSort に応じて songs をソートして返す
 * ※ 日付ソートには「日付」列 (YYYY/MM/DD) を使う
 */
function sortSongs(songs) {
  // 曲名順
  if (currentSort === 'title') {
    return songs.sort((a, b) =>
      (a['曲名'] || '').localeCompare(b['曲名'] || '', 'ja')
    );
  }

  // ランダム
  if (currentSort === 'random') {
    for (let i = songs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [songs[i], songs[j]] = [songs[j], songs[i]];
    }
    return songs;
  }

  // 配信日順（新しい順 / 古い順）
  return songs.sort((a, b) => {
    const da = new Date(a['日付']);
    const db = new Date(b['日付']);
    return currentSort === 'date-asc'
      ? da - db  // 古い順
      : db - da; // 新しい順
  });
}

function renderBySession(songs) {
  const container = document.getElementById('song-list');
  container.innerHTML = '';

  const sessions = songs.reduce((acc, song) => {
    const key = song['配信URL'];
    if (!acc[key]) {
      acc[key] = {
        date:  song['配信日'],
        title: song['配信タイトル'],
        items: []
      };
    }
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
    const t = song['曲名'] || '（曲名なし）';
    (acc[t] ||= []).push(song);
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
    btn.setAttribute('aria-expanded', 'false');
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

/**
 * １曲分のカード要素を返す共通関数（CSSクロップ版）
 */
function createCardCol(song) {
    const title        = song['曲名'] || '（曲名なし）';
    const date         = song['日付'] || '';
    const sessionTitle = song['配信タイトル'] || '';
    const note         = song['備考'] || '';
    const timeLink     = song['リンク'] || '';
    const origLink     = song['配信URL'] || '';
    const thumbUrl     = song['ThumbnailURL'] || '';
  
    // サムネイルラッパー
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
              ? `<a href="${timeLink}" target="_blank" class="btn btn-primary flex-fill">
                   曲再生スタート
                 </a>`
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