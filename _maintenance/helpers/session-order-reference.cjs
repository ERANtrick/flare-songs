// 製品コードを呼ばず、テスト側で期待値を計算する。
function secondsForURL(value) {
  let u;try{u=new URL(value)}catch{return null}
  if([...u.searchParams.keys()].some(name=>!name.trim()))return null;
  let raw;
  if(u.searchParams.has('t'))raw=u.searchParams.get('t');
  else if(u.searchParams.has('start'))raw=u.searchParams.get('start');
  else if(u.hash.startsWith('#t='))raw=u.hash.substring(3);
  else return 0;
  if(!raw)return null;
  let seconds;
  if(/^\d+$/.test(raw))seconds=Number(raw);
  else {
    const tokens=[...raw.matchAll(/(\d+)([hms])/g)],rank={h:3,m:2,s:1},multiplier={h:3600,m:60,s:1};
    if(!tokens.length||tokens.map(m=>m[0]).join('')!==raw||tokens.some((m,i)=>i>0&&rank[m[2]]>=rank[tokens[i-1][2]]))return null;
    seconds=tokens.reduce((sum,m)=>sum+Number(m[1])*multiplier[m[2]],0);
  }
  return Number.isSafeInteger(seconds)?seconds:null;
}
function withinSession(rows){const timed=rows.map((row,index)=>({row,index,seconds:secondsForURL(row['リンク'])}));return timed.some(x=>x.seconds===null)?rows.slice():timed.sort((a,b)=>a.seconds-b.seconds||a.index-b.index).map(x=>x.row)}
function sessionsInOrder(rows,sort='date-desc'){
  const map=new Map();
  for(const row of rows.filter(s=>s['公開']==='公開')){const url=row['配信URL'];if(!map.has(url))map.set(url,{url,date:new Date(row['日付']),rows:[]});map.get(url).rows.push(row)}
  if(!['date-desc','date-asc'].includes(sort))throw Error('Use a literal expectation for random session order');
  return [...map.values()].sort((a,b)=>sort==='date-asc'?a.date-b.date:b.date-a.date).map(g=>({...g,rows:withinSession(g.rows)}));
}
function orderedLinks(rows,sort){return sessionsInOrder(rows,sort).flatMap(g=>g.rows.map(row=>new URL(row['リンク']).href))}
module.exports={secondsForURL,withinSession,sessionsInOrder,orderedLinks};
