const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS1O8_fE8vDDkvocXwcSIEAtF8eyxH-Jq_-6Wu09RCO1Y0AG7dfXYGsgjtJCCAqaJ37IX9YF23lZ3Ns/pub?output=csv';

const i18n = {
  ja: {
    mode: "表示モード",
    darkmode: "ダークモード",
    lightmode: "ライトモード",
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
    load_more: 'さらに表示（残り{count}件）',
    surprise_heading: 'おまかせで1曲',
    surprise_all: 'すべて',
    surprise_mv: 'MV・カバー曲',
    surprise_singing: '歌枠',
    surprise_live: '3Dライブ・配信',
    surprise_pick: '1曲選ぶ',
    surprise_close: '閉じる',
    surprise_listen: 'YouTubeで聴く',
    surprise_again: '別の曲を選ぶ',
    surprise_add: 'お気に入りに登録',
    surprise_remove: 'お気に入りを解除',
    surprise_history: 'この曲の歌唱履歴を見る（全{count}件）',
    surprise_loading: '曲データを読み込み中です…',
    surprise_empty: 'このカテゴリには再生できる曲がありません。別のカテゴリを選んでください。',
    surprise_error: '曲データを読み込めませんでした。ページを再読み込みしてください。',
    load_timeout: '曲データの読み込みに時間がかかりすぎました。再読み込みをお試しください。',
    load_retry: '再読み込み',
    data_excluded: '一部の曲データを表示できませんでした（{count}件）。',
  },
  en: {
    mode: "Display Mode",
    darkmode: "Dark Mode",
    lightmode: "Light Mode",
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
    load_more: 'Show more ({count} remaining)',
    surprise_heading: 'Let Flare surprise you',
    surprise_all: 'All categories',
    surprise_mv: 'MVs & covers',
    surprise_singing: 'Singing streams',
    surprise_live: '3D live shows & streams',
    surprise_pick: 'Pick a song',
    surprise_close: 'Close',
    surprise_listen: 'Listen on YouTube',
    surprise_again: 'Pick another song',
    surprise_add: 'Add to favorites',
    surprise_remove: 'Remove from favorites',
    surprise_history: 'See all performances ({count})',
    surprise_loading: 'Loading songs…',
    surprise_empty: 'No playable songs in this category. Please choose another category.',
    surprise_error: 'Songs could not be loaded. Please reload this page.',
    load_timeout: 'Loading songs took too long. Please try reloading.',
    load_retry: 'Reload',
    data_excluded: 'Some song records could not be displayed ({count}).',
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
let exactSongTitle = null; // 通常の部分一致検索とは別の、履歴表示専用の条件。
let viewRevision = 0;
let currentSurprise = null;
let surpriseStatusKey = 'surprise_loading';
let songsLoaded = false;
let songLoadState = 'loading';
let loadErrorKey = 'surprise_error';
let songLoadRevision = 0;
let activeSongRequest = null;
let dataDiagnostics = null;
const CSV_LOAD_TIMEOUT_MS = 30000;
const REQUIRED_SONG_HEADERS = ['曲名', '日付', '配信日', '配信タイトル', '配信URL', 'リンク', 'ThumbnailURL', '公開', 'Category'];
let favoriteMemory = [];
let drawHistoryMemory = [];
let favoriteStorageAvailable = true;
let favoritesLoaded = false;
let favoriteKeys = new Set();
let activeSessionRender = null;
let accordionLoaders = new WeakMap();
// 並び順の選択中は、絞り込み前の全曲名の順位をCSVデータ単位で保持する。
let randomSongTitleRanks = new WeakMap();
// 20・50・100件を実測し、初期DOMと追加描画の応答が小さい20件を採用。
const SESSION_BATCH_SIZE = 20;
let drawStorageAvailable = true;
const DRAW_HISTORY_KEY = 'flare-songs:surprise-history:v1';
const DRAW_HISTORY_LIMIT = 10;
const surpriseCategories = {
  all: null, // 将来追加されたカテゴリも対象。
  mv: ['オリジナルMV', 'カバー曲'],
  singing: ['歌枠', '歌枠(コラボ)'],
  live: ['3Dライブ', '3D配信']
};

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
      document.documentElement.lang = currentLang;
      updateUILabels();
      initSortSelect();
      initSessionSelect();
      initCategory();
      renderSurpriseResult();
      applyView();
    });
  }
}
function initDarkmodeToggle() {
  const darkmode = document.getElementById("dark-mode-btn");
  if (darkmode) {
    darkmode.addEventListener("click",()=>{
      const theme = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-bs-theme', theme);
      // headでの初期復元と同じ専用キーを使用する。
      try { localStorage.setItem('flare-songs:theme:v1', theme); } catch (_) {}
      updateDarkmodeLabel();
    });
  }
}

function updateDarkmodeLabel() {
  const nextMode = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'lightmode' : 'darkmode';
  document.getElementById('dark-mode-btn').textContent = i18n[currentLang][nextMode];
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

  updateDarkmodeLabel();
  // お気に入りボタンの表示内容とクラスの統一（ここを追加）
  const favBtn = document.getElementById("fav-only-btn");
  favBtn.textContent = favOnlyMode ? t.fav_toggle_on : t.fav_toggle_off;

  favBtn.classList.toggle("active", favOnlyMode);
  favBtn.classList.toggle("btn-warning", favOnlyMode);
  favBtn.classList.toggle("btn-outline-warning", !favOnlyMode);
  updateSurpriseLabels();
  syncFavoriteButtons();
  activeSessionRender?.updateLabel();
  renderDataNotice();
}


function getFavorites(){
  if(!favoritesLoaded) refreshFavorites();
  return [...favoriteMemory];
}

function refreshFavorites() {
  if (favoriteStorageAvailable) {
    try {
      const saved = JSON.parse(localStorage.getItem('favorites') || '[]');
      favoriteMemory = Array.isArray(saved) ? saved.filter(value => typeof value === 'string') : [];
    } catch (_) { favoriteStorageAvailable = false; }
  }
  favoriteKeys = new Set(favoriteMemory);
  favoritesLoaded = true;
}

function saveFavorites(favs) {
  favoriteMemory = [...favs];
  favoriteKeys = new Set(favs);
  favoritesLoaded = true;
  try { localStorage.setItem('favorites', JSON.stringify(favs)); } catch (_) { favoriteStorageAvailable = false; }
}
function addFavorite(link) {
  const favs = getFavorites();
  if (!favs.includes(link)) {
    favs.push(link);
    saveFavorites(favs);
  }
}
function removeFavorite(link) {
  const favs = getFavorites().filter(f => f !== link);
  saveFavorites(favs);
}
function isFavorite(link) {
  if (!favoritesLoaded) refreshFavorites();
  return favoriteKeys.has(link);
}

function createCardCol(song) {
  const title = song['曲名'] || '（曲名なし）';
  const col = makeElement('div', 'col-12 col-sm-6 col-md-4');
  const card = makeElement('div', 'card h-100 position-relative');
  const imgURL = safeWebURL(song['ThumbnailURL']);
  if (imgURL) {
    const wrapper = makeElement('div', 'card-img-wrapper');
    const image = makeElement('img');
    image.loading = 'lazy';
    image.src = imgURL;
    image.alt = title;
    wrapper.append(createFavoriteButton(song), image);
    card.append(wrapper);
  }
  const body = makeElement('div', 'card-body d-flex flex-column');
  body.append(makeElement('h5', 'card-title', title));
  const meta = [song['配信日'], song['配信タイトル']].filter(Boolean).join(' ｜ ');
  if (meta) {
    const metaNode = makeElement('p', 'text-muted mb-2', meta);
    metaNode.style.fontSize = '0.9rem';
    body.append(metaNode);
  }
  if (song['備考']) body.append(makeElement('p', 'text-muted mb-2', song['備考']));
  const actions = makeElement('div', 'mt-auto d-flex gap-2');
  for (const [field, label, css, eventName] of [
    ['リンク', 'play', 'btn-primary', 'click_play'],
    ['配信URL', 'link', 'btn-secondary', 'click_orig']
  ]) {
    const url = safeWebURL(song[field]);
    if (!url) continue;
    const anchor = makeElement('a', 'btn ' + css + ' flex-fill', i18n[currentLang][label]);
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.dataset.track = label === 'play' ? 'play' : 'orig';
    anchor.addEventListener('click', () => trackSongEvent(eventName, song, song[field], label === 'play' ? 'Song' : 'Stream'));
    actions.append(anchor);
  }
  if (!actions.childElementCount) actions.append(makeElement('span', 'text-secondary', i18n[currentLang].unknown));
  body.append(actions);
  card.append(body);
  col.append(card);
  return col;
}

function renderBySession(songs,sortKey){
  const c=document.getElementById('song-list');
  c.classList.remove('accordion');
  c.replaceChildren();
  const sessionMap=new Map();
  for(const song of songs){
    const key=song['配信URL'];
    if(!sessionMap.has(key)) sessionMap.set(key,{
      key,label:`${song['配信日']} ｜ ${song['配信タイトル']}`,
      date:new Date(song['日付']),items:[]
    });
    sessionMap.get(key).items.push(song);
  }
  const sessions=[...sessionMap.values()];
  if(sortKey==='random') sessions.sort(()=>Math.random()-0.5);
  else sessions.sort((a,b)=>sortKey==='date-asc'?a.date-b.date:b.date-a.date);
  for(const session of sessions) session.items = sortSessionSongsByStart(session.items);

  const more=document.getElementById('load-more-btn');
  const anchor=document.getElementById('scroll-anchor');
  const state={revision:viewRevision,sessionIndex:0,itemIndex:0,rendered:0,row:null,observer:null,frame:null};
  activeSessionRender=state;
  const valid=()=>activeSessionRender===state&&state.revision===viewRevision;
  const hasMore=()=>state.sessionIndex<sessions.length;
  const updateLabel=()=>{
    more.hidden=!hasMore();
    more.textContent=i18n[currentLang].load_more.replace('{count}',songs.length-state.rendered);
  };
  const schedule=()=>{
    if(!valid()||!hasMore()||state.frame!==null)return;
    state.frame=requestAnimationFrame(append);
  };
  function append(){
    state.frame=null;
    if(!valid())return;
    const fragment=document.createDocumentFragment();
    let remaining=SESSION_BATCH_SIZE;
    while(hasMore()&&remaining>0){
      const session=sessions[state.sessionIndex];
      if(state.itemIndex===0){
        const heading=makeElement('h5','mt-4',session.label);
        heading.dataset.sessionUrl=session.key||'';
        state.row=makeElement('div','row g-3 mb-3');
        state.row.dataset.sessionUrl=session.key||'';
        fragment.append(heading,state.row);
      }
      const cards=document.createDocumentFragment();
      const count=Math.min(remaining,session.items.length-state.itemIndex);
      for(let i=0;i<count;i++)cards.append(createCardCol(session.items[state.itemIndex++]));
      state.row.append(cards);
      state.rendered+=count;
      remaining-=count;
      if(state.itemIndex===session.items.length){
        state.sessionIndex++;
        state.itemIndex=0;
        state.row=null;
      }
    }
    c.append(fragment);
    updateLabel();
    if(!hasMore()){
      state.observer?.disconnect();
      more.onclick=null;
    }else if(anchor.getBoundingClientRect().top<window.innerHeight+600){
      // 一画面に収まる少数の結果でも、observerが再通知しないまま止まらないようにする。
      schedule();
    }
  }
  state.updateLabel=updateLabel;
  more.onclick=schedule;
  append();
  if(hasMore()&&typeof IntersectionObserver==='function'){
    state.observer=new IntersectionObserver(entries=>{
      if(valid()&&entries.some(entry=>entry.isIntersecting))schedule();
    },{rootMargin:'600px 0px'});
    state.observer.observe(anchor);
  }
}

function getRandomSongTitleRanks() {
  let ranks = randomSongTitleRanks.get(allSongs);
  if (!ranks) {
    const titles = [...groupSongsByTitle(allSongs.filter(song => song['公開'] === '公開')).keys()];
    for (let i = titles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [titles[i], titles[j]] = [titles[j], titles[i]];
    }
    ranks = new Map(titles.map((title, index) => [title, index]));
    randomSongTitleRanks.set(allSongs, ranks);
  }
  return ranks;
}

function renderGrouped(songs){
  const revision=viewRevision;
  const c=document.getElementById('song-list');
  c.classList.add('accordion');
  c.replaceChildren();
  const sortKey=document.getElementById('sort-session').value;
  const groups=[...groupSongsByTitle(songs)].map(([title,list])=>{
    list.sort((a,b)=>new Date(a['日付'])-new Date(b['日付']));
    if(sortKey!=='date-asc')list.reverse();
    return {title,list,repDate:new Date(list[0]['日付'])};
  });
  if(sortKey==='random'){
    const ranks=getRandomSongTitleRanks();
    groups.sort((a,b)=>ranks.get(a.title)-ranks.get(b.title));
  }else groups.sort((a,b)=>sortKey==='date-asc'?a.repDate-b.repDate:b.repDate-a.repDate);
  const fragment=document.createDocumentFragment();
  groups.forEach(({title,list},i)=>{
    const id='grp'+i;
    const item=makeElement('div','accordion-item');
    item.dataset.songTitle=title;
    const header=makeElement('h2','accordion-header');
    header.id='heading-'+id;
    const button=makeElement('button','accordion-button collapsed',title+' （'+list.length+'件）');
    button.type='button';
    button.dataset.bsToggle='collapse';
    button.dataset.bsTarget='#collapse-'+id;
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-controls','collapse-'+id);
    header.append(button);
    const collapse=makeElement('div','accordion-collapse collapse');
    collapse.id='collapse-'+id;
    collapse.dataset.bsParent='#song-list';
    const body=makeElement('div','accordion-body p-0');
    const row=makeElement('div','row g-3 m-3');
    let loaded=false;
    const populate=()=>{
      // 閉じたグループにはカードを作らず、開く直前に全歌唱履歴を作る。
      if(loaded||revision!==viewRevision||!collapse.isConnected)return;
      const cards=document.createDocumentFragment();
      list.forEach(song=>cards.append(createCardCol(song)));
      row.append(cards);
      loaded=true;
    };
    accordionLoaders.set(collapse,populate);
    collapse.addEventListener('show.bs.collapse',event=>{
      if(event.target===collapse)populate();
    });
    collapse.addEventListener('hidden.bs.collapse',event=>{
      if(event.target===collapse&&revision===viewRevision&&!collapse.classList.contains('show')){
        row.replaceChildren();
        loaded=false;
      }
    });
    body.append(row);
    collapse.append(body);
    item.append(header,collapse);
    fragment.append(item);
  });
  c.append(fragment);
}

function cancelListRender() {
  if (activeSessionRender) {
    activeSessionRender.observer?.disconnect();
    if (activeSessionRender.frame !== null) cancelAnimationFrame(activeSessionRender.frame);
    activeSessionRender = null;
  }
  const more = document.getElementById('load-more-btn');
  more.hidden = true;
  more.onclick = null;
  accordionLoaders = new WeakMap();
  document.querySelectorAll('#song-list .accordion-collapse').forEach(collapse => {
    // Bootstrapの保留中コールバックを完了させてから破棄し、旧DOMを保持させない。
    if (collapse.classList.contains('collapsing')) collapse.dispatchEvent(new Event('transitionend', { bubbles: true }));
    if (typeof bootstrap !== 'undefined') bootstrap.Collapse.getInstance(collapse)?.dispose();
  });
}

function applyView({ revealHistory = false } = {}) {
  const revision = ++viewRevision;
  cancelListRender();
  if (songLoadState !== 'ready') {
    renderListLoadState();
    return Promise.resolve(false);
  }
  showSpinner();
  return new Promise(resolve => {
    setTimeout(() => {
      if (revision !== viewRevision || songLoadState !== 'ready') return resolve(false);
      const mode = document.getElementById('mode-select').value;
      const session = document.getElementById('session-select').value;
      const category = document.getElementById('category-select').value;
      const sort = document.getElementById('sort-session').value;
      const kw = document.getElementById('search-input').value.trim().toLowerCase();
      let list = allSongs.filter(s => s['公開'] === '公開');
      if (exactSongTitle !== null) {
        list = list.filter(s => s['曲名'] === exactSongTitle);
      } else {
        if (favOnlyMode) {
          const favs = getFavorites();
          list = list.filter(s => favs.includes(s['リンク'] || s['配信URL']));
        }
        if (session) list = list.filter(s => s['配信URL'] === session);
        if (category) list = list.filter(s => s['Category'] === category);
        if (kw) list = list.filter(s => (s['曲名'] || '').toLowerCase().includes(kw));
      }
      const c = document.getElementById('song-list');
      if (!list.length) {
        c.classList.remove('accordion');
        c.replaceChildren(makeElement('div', 'text-center my-5 text-muted', i18n[currentLang].no_result));
        return resolve(true);
      }
      if (mode === 'session' && !kw && exactSongTitle === null) renderBySession(list, sort);
      else renderGrouped(list);
      if (exactSongTitle !== null) {
        const item = [...c.querySelectorAll('.accordion-item')].find(node => node.dataset.songTitle === exactSongTitle);
        if (item) {
          // 描画済みDOMを開く。Bootstrapの次回の開閉操作とも状態を合わせる。
          const collapse = item.querySelector('.accordion-collapse');
          accordionLoaders.get(collapse)?.();
          collapse.classList.add('show');
          const button = item.querySelector('.accordion-button');
          button.classList.remove('collapsed');
          button.setAttribute('aria-expanded', 'true');
          if (revealHistory) {
            requestAnimationFrame(() => {
              if (revision !== viewRevision || !item.isConnected) return resolve(false);
              item.scrollIntoView({ behavior: 'auto', block: 'start' });
              button.focus({ preventScroll: true });
              resolve(true);
            });
            return;
          }
        }
      }
      resolve(true);
    }, 100);
  });
}

function initUI() {
  window.addEventListener('storage', event => {
    if (event.key !== 'favorites' && event.key !== null) return;
    favoritesLoaded = false;
    favoriteStorageAvailable = true;
    refreshFavorites();
    syncFavoriteButtons();
    if (favOnlyMode) applyView();
  });
  const normalView = () => { exactSongTitle = null; return applyView(); };
  document.getElementById('session-select').addEventListener('change', normalView);
  document.getElementById('mode-select').addEventListener('change', (e) => {
    const selectedMode = e.target.value;
  
    // GAイベント送信
    if (typeof gtag === 'function') {
      gtag('event', 'change_mode', {
        event_category: 'UI',
        event_label: selectedMode // "session" または "song"
      });
    }
  
    normalView();
  });
  
  document.getElementById('search-input').addEventListener('input', normalView);
  document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('mode-select').value = 'session';
    document.getElementById('session-select').value = '';
    document.getElementById('category-select').value = '';
    document.getElementById('sort-session').value = sessionSortOpts[0].value;
    document.getElementById('search-input').value = '';
    favOnlyMode = false;
    updateUILabels();
    normalView();
  });

  document.getElementById("fav-only-btn").addEventListener("click", () => {
    favOnlyMode = !favOnlyMode;
    const btn = document.getElementById("fav-only-btn");
    btn.classList.toggle("active");
    btn.classList.toggle("btn-warning");
    btn.classList.toggle("btn-outline-warning");
    updateUILabels();
    normalView();
  });
}

function initSessionSelect() {
  const sel = document.getElementById('session-select');
  const previousValue = sel.value;
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
  sel.value = previousValue;
}

function initCategory() {
  const sel = document.getElementById('category-select');
  const previousValue = sel.value;
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

  sel.value = previousValue;
  sel.onchange = (e) => {
    const selectedCategory = e.target.value;

    // GAイベント送信
    if (typeof gtag === 'function') {
      gtag('event', 'change_category', {
        event_category: 'UI',
        event_label: selectedCategory || 'All'
      });
    }

    exactSongTitle = null;
    applyView();
  };
}



// 曲名の表記は加工せず、既存の曲名一覧と抽選でグループを共有する。
function groupSongsByTitle(songs) {
  const groups = new Map();
  for (const song of songs) {
    const title = song['曲名'] || '（曲名なし）';
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title).push(song);
  }
  return groups;
}

function safeWebURL(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch (_) { return ''; }
}

function isPlayableYouTubeLink(value) {
  const safe = safeWebURL(value);
  if (!safe) return false;
  const url = new URL(safe);
  const videoID = /^[A-Za-z0-9_-]{11}$/;
  if (['youtu.be', 'www.youtu.be'].includes(url.hostname)) {
    return videoID.test(url.pathname.replace(/^\//, '').replace(/\/$/, ''));
  }
  if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) return false;
  if (url.pathname === '/watch') return videoID.test(url.searchParams.get('v') || '');
  return /^\/(?:shorts|live|embed)\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname);
}

function getSurpriseGroups(songs, category) {
  const allowed = surpriseCategories[category];
  if (allowed === undefined) return new Map();
  return groupSongsByTitle(songs.filter(song =>
    song['公開'] === '公開' && typeof song['曲名'] === 'string' && song['曲名'].trim() &&
    isPlayableYouTubeLink(song['リンク']) && (!allowed || allowed.includes(song['Category']))
  ));
}

// 候補が空なら、最古の履歴から一つずつ制限を緩める（最大10回）。
function chooseSurpriseSong(groups, history = [], random = Math.random) {
  if (!groups.size) return null;
  const recent = history.slice(-DRAW_HISTORY_LIMIT);
  const lastTitle = recent[recent.length - 1];
  const titles = [...groups.keys()];
  let candidates = titles.filter(title => !recent.includes(title));
  while (!candidates.length && recent.length) {
    recent.shift();
    candidates = titles.filter(title => !recent.includes(title));
  }
  if (titles.length > 1) {
    const others = candidates.filter(title => title !== lastTitle);
    if (others.length) candidates = others;
  }
  const title = candidates[Math.floor(random() * candidates.length)];
  const performances = groups.get(title);
  return performances[Math.floor(random() * performances.length)];
}

function getDrawHistory() {
  if (!drawStorageAvailable) return [...drawHistoryMemory];
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAW_HISTORY_KEY) || '[]');
    if (Array.isArray(saved)) drawHistoryMemory = saved.filter(title => typeof title === 'string').slice(-DRAW_HISTORY_LIMIT);
  } catch (_) { drawStorageAvailable = false; }
  return [...drawHistoryMemory];
}

function rememberDraw(title) {
  drawHistoryMemory = [...getDrawHistory(), title].slice(-DRAW_HISTORY_LIMIT);
  try { sessionStorage.setItem(DRAW_HISTORY_KEY, JSON.stringify(drawHistoryMemory)); } catch (_) { drawStorageAvailable = false; }
}

function makeElement(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function trackSongEvent(name, song, link, category) {
  if (typeof gtag === 'function') {
    gtag('event', name, {
      event_category: category,
      event_label: song['曲名'] || '（曲名なし）',
      session_title: song['配信タイトル'] || '',
      link_url: link
    });
  }
}

function toggleSongFavorite(song) {
  const key = song['リンク'] || song['配信URL'];
  if (!key) return;
  const previous = isFavorite(key);
  if (previous) removeFavorite(key);
  else addFavorite(key);
  trackSongEvent(previous ? 'click_fav_remove' : 'click_fav_add', song, key, 'Favorite');
  syncFavoriteButtons(key);
  if (favOnlyMode) applyView();
}

function createFavoriteButton(song) {
  const button = makeElement('button', 'fav-btn');
  button.type = 'button';
  button.dataset.favoriteKey = song['リンク'] || song['配信URL'] || '';
  button.dataset.songTitle = song['曲名'] || '（曲名なし）';
  updateFavoriteButton(button, isFavorite(button.dataset.favoriteKey));
  button.addEventListener('click', () => toggleSongFavorite(song));
  return button;
}

function updateFavoriteButton(button, active) {
  button.textContent = active ? '★' : '☆';
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', String(active));
  button.setAttribute('aria-label', i18n[currentLang][active ? 'surprise_remove' : 'surprise_add'] + ': ' + button.dataset.songTitle);
}

function syncFavoriteButtons(key=null){
  if(!favoritesLoaded)refreshFavorites();
  document.querySelectorAll('[data-favorite-key]').forEach(button=>{
    if(key===null||button.dataset.favoriteKey===key)updateFavoriteButton(button,favoriteKeys.has(button.dataset.favoriteKey));
  });
  syncSurpriseFavoriteButton();
}

function syncSurpriseFavoriteButton() {
  if (!currentSurprise) return;
  const button = document.getElementById('surprise-favorite');
  const active = isFavorite(currentSurprise['リンク'] || currentSurprise['配信URL']);
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', String(active));
  button.querySelector('.surprise-star').textContent = active ? '★' : '☆';
  setSurpriseButtonLabel('favorite', active ? 'surprise_remove' : 'surprise_add');
}

function setSurpriseButtonLabel(name, key, count) {
  const node = document.querySelector('[data-surprise-label="' + name + '"]');
  node.textContent = i18n[currentLang][key].replace('{count}', count ?? '');
  node.lang = currentLang;
}

function updateSurpriseLabels() {
  const t = i18n[currentLang];
  document.getElementById('surprise-heading').textContent = t.surprise_heading;
  document.getElementById('surprise-category-label').textContent = t.category;
  const select = document.getElementById('surprise-category');
  for (const option of select.options) option.textContent = t['surprise_' + option.value];
  const pick = document.getElementById('surprise-pick');
  setSurpriseButtonLabel('pick', currentSurprise ? 'surprise_close' : 'surprise_pick');
  pick.classList.toggle('btn-primary', !currentSurprise);
  pick.classList.toggle('btn-outline-secondary', !!currentSurprise);
  pick.querySelector('.surprise-icon').hidden = !!currentSurprise;
  for (const [name, key] of [['listen', 'surprise_listen'], ['again', 'surprise_again']]) {
    setSurpriseButtonLabel(name, key);
  }
  const count = currentSurprise ? getPublicHistory(currentSurprise['曲名']).length : 0;
  setSurpriseButtonLabel('history', 'surprise_history', count);
  const status = document.getElementById('surprise-status');
  status.textContent = surpriseStatusKey ? t[surpriseStatusKey] : '';
  status.hidden = !surpriseStatusKey;
}

function getPublicHistory(title) {
  return allSongs.filter(song => song['公開'] === '公開' && song['曲名'] === title);
}

function renderSurpriseResult() {
  const result = document.getElementById('surprise-result');
  result.hidden = !currentSurprise;
  document.getElementById('surprise-pick').setAttribute('aria-expanded', String(!!currentSurprise));
  updateSurpriseLabels();
  if (!currentSurprise) return;
  const song = currentSurprise;
  document.getElementById('surprise-song-title').textContent = song['曲名'];
  const details = {
    'surprise-date': song['配信日'] || song['日付'],
    'surprise-song-category': categoryTranslations[song['Category']]?.[currentLang] || song['Category'],
    'surprise-session': song['配信タイトル']
  };
  for (const [id, value] of Object.entries(details)) {
    const node = document.getElementById(id);
    node.textContent = value || '';
    node.hidden = !value;
  }
  const image = document.getElementById('surprise-thumbnail');
  const imageURL = safeWebURL(song['ThumbnailURL']);
  image.parentElement.hidden = !imageURL;
  if (imageURL) {
    image.src = imageURL;
    image.alt = song['曲名'];
  } else image.removeAttribute('src');
  document.getElementById('surprise-play').href = safeWebURL(song['リンク']);
  document.getElementById('surprise-history').hidden = getPublicHistory(song['曲名']).length < 2;
  syncSurpriseFavoriteButton();
}

function drawSurprise() {
  if (!songsLoaded) return;
  const category = document.getElementById('surprise-category').value;
  currentSurprise = chooseSurpriseSong(getSurpriseGroups(allSongs, category), getDrawHistory());
  surpriseStatusKey = currentSurprise ? '' : 'surprise_empty';
  if (currentSurprise) rememberDraw(currentSurprise['曲名']);
  renderSurpriseResult();
}

function showSurpriseHistory() {
  if (!currentSurprise) return Promise.resolve(false);
  exactSongTitle = currentSurprise['曲名'];
  document.getElementById('mode-select').value = 'song';
  document.getElementById('session-select').value = '';
  document.getElementById('category-select').value = '';
  document.getElementById('sort-session').value = 'date-desc';
  document.getElementById('search-input').value = exactSongTitle;
  favOnlyMode = false;
  updateUILabels();
  return applyView({ revealHistory: true });
}

function closeSurpriseResult() {
  currentSurprise = null;
  surpriseStatusKey = songsLoaded ? '' : surpriseStatusKey;
  renderSurpriseResult();
}

function initSurprise() {
  document.getElementById('surprise-pick').addEventListener('click', () => {
    if (currentSurprise) closeSurpriseResult();
    else drawSurprise();
  });
  document.getElementById('surprise-again').addEventListener('click', drawSurprise);
  document.getElementById('surprise-category').addEventListener('change', closeSurpriseResult);
  document.getElementById('surprise-favorite').addEventListener('click', () => {
    if (currentSurprise) toggleSongFavorite(currentSurprise);
  });
  document.getElementById('surprise-history').addEventListener('click', showSurpriseHistory);
  document.getElementById('surprise-play').addEventListener('click', () => {
    if (currentSurprise) trackSongEvent('click_play', currentSurprise, currentSurprise['リンク'], 'Song');
  });
  document.getElementById('surprise-thumbnail').addEventListener('error', event => {
    event.target.parentElement.hidden = true;
  });
}

function initSortSelect() {
  const ss = document.getElementById('sort-session');
  const previousValue = ss.value;
  ss.innerHTML = '';
  sessionSortOpts.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.text[currentLang];
    ss.appendChild(opt);
  });
  ss.value = previousValue || sessionSortOpts[0].value;

  ss.onchange = (e) => {
    const selectedSort = e.target.value;
    randomSongTitleRanks = new WeakMap();

    // GAイベント送信
    if (typeof gtag === 'function') {
      gtag('event', 'change_sort', {
        event_category: 'UI',
        event_label: selectedSort
      });
    }

    exactSongTitle = null;
    applyView();
  };
}

// PapaParse 5.3.2のmeta.fieldsは重複を残す。後続版のrenamedHeadersには依存しない。
function validateSongCSV({ data, errors, meta } = {}) {
  const report = { totalRows: Array.isArray(data) ? data.length : 0, acceptedRows: 0,
    publicRows: Array.isArray(data) ? data.filter(song => song?.['公開'] === '公開').length : 0,
    acceptedPublicRows: 0, excludedRows: 0, ignoredBlankRows: 0, issues: [], counts: {} };
  const issue = (severity, code, row, details = {}) => {
    // rowはヘッダーを除いた1始まりのデータレコード番号。引用符内の改行では増やさない。
    report.issues.push({ severity, code, row: row === null ? null : row + 1, ...details });
  };
  const fields = meta?.fields;
  if (!Array.isArray(data) || !Array.isArray(errors) || !Array.isArray(fields)) {
    issue('fatal', 'invalid_parse_result', null);
  } else {
    const seen = new Set();
    fields.forEach(field => {
      const name = typeof field === 'string' ? field.trim() : '';
      if (seen.has(name)) issue('fatal', 'duplicate_header', null, { field });
      seen.add(name);
    });
    REQUIRED_SONG_HEADERS.forEach(field => {
      if (!fields.includes(field)) issue('fatal', 'missing_header', null, { field });
    });
    if (meta.aborted || meta.truncated) issue('fatal', 'incomplete_parse', null);
  }
  const invalidRows = new Set();
  for (const error of Array.isArray(errors) ? errors : []) {
    const row = error.row;
    if (error.type === 'FieldMismatch' && Number.isInteger(row) && row >= 0 && row < report.totalRows) {
      invalidRows.add(row);
      // 末尾の空行は後で除外し、警告や不正行数には含めない。
      if (Object.values(data[row]).some(value => Array.isArray(value) ? value.some(Boolean) : String(value ?? '').trim())) {
        issue('error', error.code, row);
      }
    } else {
      // 引用符異常はレコード境界を保証できないため、部分的な復旧を試みない。
      // 5.3.2のQuotes.rowはヘッダーを含むが、FieldMismatch.rowは含まない。
      const dataRow = error.type === 'Quotes' ? (row > 0 ? row - 1 : null) : row;
      issue('fatal', error.code || 'parse_error', Number.isInteger(dataRow) ? dataRow : null, { type: error.type });
    }
  }
  const songs = [];
  const playbackPoints = new Map();
  if (!report.issues.some(item => item.severity === 'fatal')) {
    data.forEach((song, row) => {
      if (!Object.values(song).some(value => Array.isArray(value) ? value.some(Boolean) : String(value ?? '').trim())) {
        report.ignoredBlankRows++;
        return;
      }
      if (invalidRows.has(row)) { report.excludedRows++; return; }
      if (song['公開'] !== '公開') {
        if (song['公開'] !== '非公開') issue('warning', 'unknown_visibility', row, { value: song['公開'] });
        songs.push(song);
        return;
      }
      const missing = ['曲名', '日付', '配信日', '配信タイトル', '配信URL', 'リンク']
        .filter(field => typeof song[field] !== 'string' || !song[field].trim());
      let invalid = false;
      if (missing.length) { issue('error', 'missing_required_value', row, { fields: missing, title: song['曲名'] }); invalid = true; }
      if (!missing.includes('日付') && !isValidSongDate(song['日付'])) {
        issue('error', 'invalid_date', row, { field: '日付', value: song['日付'] }); invalid = true;
      }
      const youtubeURLs = new Map();
      for (const field of ['配信URL', 'リンク']) {
        if (missing.includes(field)) continue;
        if (!isPlayableYouTubeLink(song[field])) {
          issue('error', 'invalid_youtube_url', row, { field, value: song[field] }); invalid = true;
        } else youtubeURLs.set(field, new URL(song[field]));
      }
      if (youtubeURLs.size === 2) {
        const streamVideoID = getYouTubeVideoID(youtubeURLs.get('配信URL'));
        const linkVideoID = getYouTubeVideoID(youtubeURLs.get('リンク'));
        if (streamVideoID !== linkVideoID) {
          issue('warning', 'video_id_mismatch', row, { fields: ['配信URL', 'リンク'], streamVideoID, linkVideoID, title: song['曲名'] });
        }
      }
      const linkURL = youtubeURLs.get('リンク');
      if (linkURL && [...linkURL.searchParams.keys()].some(name => !name.trim())) {
        issue('warning', 'empty_query_parameter', row, { field: 'リンク', value: song['リンク'], title: song['曲名'] });
      }
      if (invalid) { report.excludedRows++; return; }
      if (!Object.prototype.hasOwnProperty.call(categoryTranslations, song.Category)) {
        issue('warning', 'unknown_category', row, { field: 'Category', value: song.Category });
      }
      if (!safeWebURL(song.ThumbnailURL)) {
        issue('warning', song.ThumbnailURL ? 'invalid_thumbnail_url' : 'missing_thumbnail', row, { field: 'ThumbnailURL' });
      }
      // 時刻は重複警告にだけ使用する。配信内の曲順・保存キー・元の値は変えない。
      const point = getPlaybackPoint(song['リンク']);
      if (point === null) issue('warning', 'invalid_start_time', row, { field: 'リンク', value: song['リンク'] });
      else if (playbackPoints.has(point)) {
        issue('warning', 'duplicate_playback_point', row, { field: 'リンク', relatedRows: [playbackPoints.get(point) + 1, row + 1], value: song['リンク'] });
      } else playbackPoints.set(point, row);
      songs.push(song);
      report.acceptedPublicRows++;
    });
  }
  if (report.publicRows > 0 && report.acceptedPublicRows === 0 && !report.issues.some(item => item.severity === 'fatal')) {
    issue('fatal', 'all_public_rows_excluded', null, {
      relatedRows: data.flatMap((song, row) => song['公開'] === '公開' ? [row + 1] : [])
    });
  }
  report.acceptedRows = songs.length;
  report.issues.forEach(item => { report.counts[item.code] = (report.counts[item.code] || 0) + 1; });
  return { songs, report, fatal: report.issues.some(item => item.severity === 'fatal') };
}

function isValidSongDate(value) {
  const match = /^(\d{4})([/-])(\d{1,2})\2(\d{1,2})$/.exec(value);
  if (!match) return false;
  const [, year, , month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day);
}

function getYouTubeVideoID(url) {
  return url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.split('/').filter(Boolean).pop();
}

// 警告と配信内の曲順で、時刻の解釈と優先順を共有する。
function getPlaybackStartSeconds(url) {
  const time = url.searchParams.get('t') ?? url.searchParams.get('start') ?? (/^#t=(.*)$/.exec(url.hash)?.[1]);
  let seconds = 0;
  if (time !== undefined && time !== null) {
    if (/^\d+$/.test(time)) seconds = Number(time);
    else {
      const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(time);
      if (!match || !time) return null;
      seconds = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
    }
  }
  return Number.isSafeInteger(seconds) ? seconds : null;
}

function getPlaybackPoint(value) {
  const url = new URL(value);
  const video = getYouTubeVideoID(url);
  const seconds = getPlaybackStartSeconds(url);
  return seconds === null ? null : video + ':' + seconds;
}

function sortSessionSongsByStart(songs) {
  const timed = songs.map((song, index) => {
    let seconds = null;
    try {
      const url = new URL(song['リンク']);
      // 空名パラメータもF01の警告対象なので、この配信はCSV順を維持する。
      if (![...url.searchParams.keys()].some(name => !name.trim())) seconds = getPlaybackStartSeconds(url);
    } catch (_) { /* 不正URLも配信単位でCSV順へフォールバックする。 */ }
    return { song, index, seconds };
  });
  if (timed.some(item => item.seconds === null)) return songs;
  return timed.sort((a, b) => a.seconds - b.seconds || a.index - b.index).map(item => item.song);
}

function publishDataDiagnostics(report) {
  dataDiagnostics = { state: songLoadState, checkedAt: new Date().toISOString(), ...report };
  if (report.issues.length) {
    console.warn('[flare-songs] CSV check:', report.counts, 'Details: flareSongsDiagnostics()');
  }
}

function renderDataNotice() {
  const notice = document.getElementById('data-notice');
  const count = songLoadState === 'ready' ? dataDiagnostics?.excludedRows || 0 : 0;
  notice.hidden = !count;
  notice.textContent = count ? i18n[currentLang].data_excluded.replace('{count}', count) : '';
}

function renderListLoadState() {
  if (songLoadState === 'loading') return showSpinner();
  const container = document.getElementById('song-list');
  container.classList.remove('accordion');
  const area = makeElement('div', 'text-center my-4');
  const message = makeElement('p', 'text-body-secondary', i18n[currentLang][loadErrorKey]);
  message.setAttribute('role', 'alert');
  const retry = makeElement('button', 'btn btn-outline-secondary', i18n[currentLang].load_retry);
  retry.type = 'button';
  retry.dataset.reloadSongs = '';
  retry.addEventListener('click', () => {
    if (typeof Papa === 'undefined') window.location.reload();
    else loadSongs();
  });
  area.append(message, retry);
  container.replaceChildren(area);
}

function setSongLoadState(state, errorKey = 'surprise_error') {
  songLoadState = state;
  songsLoaded = state === 'ready';
  loadErrorKey = errorKey;
  surpriseStatusKey = state === 'ready' ? '' : state === 'loading' ? 'surprise_loading' : errorKey;
  document.getElementById('surprise-pick').disabled = !songsLoaded;
}

// 5.3.2にはdownloadTimeoutがないため、通信はXMLHttpRequestのtimeout/abortで管理する。
function loadSongs({ timeoutMs = CSV_LOAD_TIMEOUT_MS } = {}) {
  const revision = ++songLoadRevision;
  activeSongRequest?.abort();
  activeSongRequest = null;
  ++viewRevision;
  cancelListRender();
  allSongs = [];
  currentSurprise = null;
  exactSongTitle = null;
  dataDiagnostics = null;
  setSongLoadState('loading');
  initSessionSelect();
  initCategory();
  updateUILabels();
  renderSurpriseResult();
  renderListLoadState();
  let settled = false;
  const current = () => revision === songLoadRevision && !settled;
  const fail = (code, errorKey = 'surprise_error', report = null) => {
    if (!current()) return;
    settled = true;
    activeSongRequest = null;
    setSongLoadState('error', errorKey);
    publishDataDiagnostics(report || { totalRows: 0, acceptedRows: 0, acceptedPublicRows: 0, excludedRows: 0,
      issues: [{ severity: 'fatal', code, row: null }], counts: { [code]: 1 } });
    renderSurpriseResult();
    renderDataNotice();
    renderListLoadState();
  };
  if (typeof Papa === 'undefined') return fail('parser_unavailable');
  const request = new XMLHttpRequest();
  activeSongRequest = request;
  request.onload = () => {
    if (!current()) return;
    if (request.status < 200 || request.status >= 300) return fail('http_error');
    let validation;
    try {
      validation = validateSongCSV(Papa.parse(request.responseText, { header: true, delimiter: ',', skipEmptyLines: false }));
    } catch (_) { return fail('parse_exception'); }
    if (validation.fatal) return fail('invalid_csv', 'surprise_error', validation.report);
    settled = true;
    activeSongRequest = null;
    allSongs = validation.songs;
    setSongLoadState('ready');
    publishDataDiagnostics(validation.report);
    initSessionSelect();
    initCategory();
    updateUILabels();
    applyView();
  };
  request.onerror = () => fail('network_error');
  request.ontimeout = () => fail('timeout', 'load_timeout');
  request.onabort = () => fail('request_aborted');
  try {
    request.open('GET', CSV_URL, true);
    request.timeout = timeoutMs;
    request.send();
  } catch (_) { fail('network_error'); }
}

window.addEventListener('DOMContentLoaded', () => {
  // UIイベントはCSV完了時や言語変更時には再登録しない。
  initLanguageToggle();
  initDarkmodeToggle();
  initSortSelect();
  initSessionSelect();
  initCategory();
  initUI();
  initSurprise();
  // 診断は要求時だけ詳細を返す。画面には除外件数だけを表示する。
  window.flareSongsDiagnostics = () => JSON.parse(JSON.stringify(dataDiagnostics));
  loadSongs();
});
