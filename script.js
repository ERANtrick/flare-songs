const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS1O8_fE8vDDkvocXwcSIEAtF8eyxH-Jq_-6Wu09RCO1Y0AG7dfXYGsgjtJCCAqaJ37IX9YF23lZ3Ns/pub?output=csv';

const i18n = {
  ja: {
    mode: "表示モード",
    darkmode: "ダークモード",
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
  },
  en: {
    mode: "Display Mode",
    darkmode: "Dark Mode",
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
let favoriteMemory = [];
let drawHistoryMemory = [];
let favoriteStorageAvailable = true;
let favoritesLoaded = false;
let favoriteKeys = new Set();
let activeSessionRender = null;
let accordionLoaders = new WeakMap();
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
//pre process
document.documentElement.getAttribute('data-bs-theme') === 'auto' && document.documentElement.setAttribute('data-bs-theme',window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
function initDarkmodeToggle() {
  const darkmode = document.getElementById("dark-mode-btn");
  if (darkmode) {
    darkmode.addEventListener("click",(e)=>{
      e.preventDefault();
      document.documentElement.setAttribute('data-bs-theme',document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark');
    });
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

  document.getElementById("dark-mode-btn").innerText = t.darkmode;
  // お気に入りボタンの表示内容とクラスの統一（ここを追加）
  const favBtn = document.getElementById("fav-only-btn");
  favBtn.textContent = favOnlyMode ? t.fav_toggle_on : t.fav_toggle_off;

  favBtn.classList.toggle("active", favOnlyMode);
  favBtn.classList.toggle("btn-warning", favOnlyMode);
  favBtn.classList.toggle("btn-outline-warning", !favOnlyMode);
  updateSurpriseLabels();
  syncFavoriteButtons();
  activeSessionRender?.updateLabel();
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
  for(const session of sessions) session.items.sort((a,b)=>(Number(a['開始秒数'])||0)-(Number(b['開始秒数'])||0));

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

function renderGrouped(songs){
  const revision=viewRevision;
  const c=document.getElementById('song-list');
  c.classList.add('accordion');
  c.replaceChildren();
  const sortKey=document.getElementById('sort-session').value;
  const groups=[...groupSongsByTitle(songs)].map(([title,list])=>{
    list.sort((a,b)=>new Date(a['日付'])-new Date(b['日付']));
    if(sortKey==='date-desc')list.reverse();
    if(sortKey==='random')list.sort(()=>Math.random()-0.5);
    return {title,list,repDate:new Date(list[0]['日付'])};
  });
  if(sortKey!=='random')groups.sort((a,b)=>sortKey==='date-asc'?a.repDate-b.repDate:b.repDate-a.repDate);
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
  showSpinner();
  return new Promise(resolve => {
    setTimeout(() => {
      if (revision !== viewRevision) return resolve(false);
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

window.addEventListener('DOMContentLoaded', () => {
  // UIイベントはCSV完了時や言語変更時には再登録しない。
  initLanguageToggle();
  initDarkmodeToggle();
  initSortSelect();
  initSessionSelect();
  initCategory();
  initUI();
  initSurprise();
  updateUILabels();
  const failLoading = () => {
    songsLoaded = false;
    surpriseStatusKey = 'surprise_error';
    updateSurpriseLabels();
    document.getElementById('song-list').replaceChildren(makeElement('p', 'text-center text-body-secondary my-4', i18n[currentLang].surprise_error));
  };
  if (typeof Papa === 'undefined') return failLoading();
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    complete: ({ data }) => {
      if (!data.some(song => Object.hasOwn(song, '曲名') && Object.hasOwn(song, '公開'))) return failLoading();
      allSongs = data;
      songsLoaded = true;
      surpriseStatusKey = '';
      document.getElementById('surprise-pick').disabled = false;
      initSessionSelect();
      initCategory();
      updateUILabels();
      applyView();
    },
    error: failLoading
  });
});
