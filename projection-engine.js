/* Scenario arithmetic only. Probability fitting stays outside the website. */
(function(root){
  'use strict';
  function possibilities(conference, results, answers={}) {
    const unique=new Map();
    for(const row of conference.rows){
      if(Object.entries(row.results).some(([id,winner])=>results[id] && results[id]!==winner))continue;
      for(const game of row.matchups){
        if(Object.entries(answers).some(([team,answer])=>answer && game.teams.includes(team)!==(answer==='yes')))continue;
        unique.set(game.id,game);
      }
    }
    return [...unique.values()];
  }
  function qualification(pairs,team){
    const count=pairs.filter(p=>p.teams.includes(team)).length;
    return count===0?'out':count===pairs.length?'in':'conditional';
  }
  function projected(data, results, championships, benchmark){
    return Object.keys(data.baseline).map(team=>{
      const base=data.baseline[team],record=[...base.record];
      let change=0,expected=0,losses=0,played=0;
      const add=game=>{
        const winner=results[game.id];
        if(!winner || !game.losses[team] || ![game.away,game.home].includes(winner))return;
        const loss=Number(winner!==team),e=game.losses[team][benchmark];
        change+=e-loss;expected+=e;losses+=loss;played++;record[loss]++;
      };
      data.games.forEach(add);
      for(const [name,id] of Object.entries(championships)){
        const conference=data.conferences.find(c=>c.name===name),game=data.championshipGames[id];
        if(!conference || !game)continue;
        // Independently validate before counting, even if state was restored/edited.
        const ready=conference.gameIds.filter(k=>data.games.some(g=>g.id===k)).every(k=>results[k]);
        if(ready && possibilities(conference,results).some(p=>p.id===id))add(game);
      }
      return {team,fei:base.fei,baseline:base.sor[benchmark],sor:base.sor[benchmark]+change,change,expected,losses,played,record};
    }).sort((a,b)=>b.sor-a.sor || a.team.localeCompare(b.team));
  }
  function ranked(data,results,championships,benchmark,feiWeight=.5,headToHead=true){
    const rows=projected(data,results,championships,benchmark);
    const z=values=>{
      const mean=values.reduce((a,b)=>a+b,0)/values.length;
      const sd=Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/values.length);
      return values.map(v=>sd?(v-mean)/sd:0);
    };
    const f=z(rows.map(r=>r.fei)),s=z(rows.map(r=>r.sor));
    rows.forEach((r,i)=>{r.feiZ=f[i];r.sorZ=s[i];r.score=feiWeight*f[i]+(1-feiWeight)*s[i];});
    rows.sort((a,b)=>b.score-a.score||a.team.localeCompare(b.team));
    let previous,rank=0;
    rows.forEach((r,i)=>{const key=Math.round(r.score*1e12);if(key!==previous)rank=i+1;r.rank=rank;r.scoreRank=rank;previous=key;});
    if(headToHead){
      const played=[...(data.pastResults||[])];
      for(const game of data.games){
        const winner=results[game.id];
        if([game.away,game.home].includes(winner))played.push([winner,winner===game.away?game.home:game.away]);
      }
      for(const c of data.conferences){
        const id=championships[c.name],game=data.championshipGames[id];
        if(!game || !possibilities(c,results).some(p=>p.id===id))continue;
        const ready=c.gameIds.filter(k=>data.games.some(g=>g.id===k)).every(k=>results[k]);
        const winner=results[id];
        if(ready && [game.away,game.home].includes(winner))played.push([winner,winner===game.away?game.home:game.away]);
      }
      const wins=new Set(played.map(([w,l])=>w+'\0'+l));
      for(let i=0;i<rows.length-1;i++){
        if(wins.has(rows[i+1].team+'\0'+rows[i].team))[rows[i],rows[i+1]]=[rows[i+1],rows[i]];
      }
      rows.forEach((r,i)=>{r.rank=i+1;});
    }
    return rows;
  }
  function defaultResults(data){return Object.fromEntries(data.games.map(g=>[g.id,g.favorite]));}
  function playoff(data,rows,results,championships){
    const missing=[],champions={},automatic=new Map();
    const contenders=new Set(data.tracked),eligible=rows.filter(r=>contenders.has(r.team));
    for(const name of data.playoff.powerConferences){
      const c=data.conferences.find(c=>c.name===name),id=championships[name],g=data.championshipGames[id],winner=results[id];
      const valid=c && g && [g.away,g.home].includes(winner) &&
        c.gameIds.filter(k=>data.games.some(g=>g.id===k)).every(k=>results[k]) && possibilities(c,results).some(p=>p.id===id);
      if(!valid){missing.push(name);continue;}
      champions[name]=winner;
      if(contenders.has(winner))automatic.set(winner,name+' champion');
    }
    if(missing.length)return {ready:false,missing,field:[],firstOut:[]};
    const g6=eligible.find(r=>data.playoff.groupSix.includes(r.team));
    if(!g6)return {ready:false,missing:['highest-ranked Group of Six team'],field:[],firstOut:[]};
    automatic.set(g6.team,'Highest-ranked Group of Six team');
    const selected=new Set(automatic.keys()),nd=eligible.find(r=>r.team==='Notre Dame');
    if(nd && rows.indexOf(nd)<12)selected.add(nd.team);
    for(const r of eligible){if(selected.size===12)break;selected.add(r.team);}
    const field=eligible.filter(r=>selected.has(r.team)).map((r,i)=>({...r,seed:i+1,bid:automatic.get(r.team)||'At-large'}));
    const firstOut=eligible.filter(r=>!selected.has(r.team)).slice(0,2);
    return {ready:true,missing:[],field,firstOut,champions};
  }
  // Deterministic beeswarm: horizontal position is exact; vertical position
  // only separates bubbles. The same layout runs in the page and unit tests.
  function bubbleLayout(rows,width,tracked,domainRows=rows){
    const frameLeft=64,frameRight=width-24,left=frameLeft+15,right=frameRight-15;
    const min=Math.min(0,...domainRows.map(r=>r.score)),max=Math.max(0,...domainRows.map(r=>r.score));
    const span=max-min||1,low=min<0?min-.06*span:0,high=max+.06*span;
    const points=[];
    for(const row of [...rows].sort((a,b)=>a.score-b.score||a.team.localeCompare(b.team))){
      const r=tracked.includes(row.team)?15:6,x=left+(row.score-low)/(high-low)*(right-left);
      const near=points.filter(p=>Math.abs(p.x-x)<p.r+r+3),candidates=[0];
      for(const p of near){const dy=Math.sqrt((p.r+r+3)**2-(x-p.x)**2);candidates.push(p.y+dy,p.y-dy);}
      candidates.sort((a,b)=>Math.abs(a)-Math.abs(b)||a-b);
      const y=candidates.find(y=>near.every(p=>(p.y-y)**2+(p.x-x)**2>=(p.r+r+2.9)**2));
      points.push({...row,x,y,r});
    }
    points.forEach(p=>p.y*=1.15);
    const bottom=Math.min(...points.map(p=>p.y-p.r)),top=Math.max(...points.map(p=>p.y+p.r));
    const frameTop=16,axisY=frameTop+24+Math.max(270,top-bottom),center=frameTop+(axisY-frameTop-(top-bottom))/2-bottom;
    points.forEach(p=>p.y+=center);
    return {points,width,height:axisY+62,axisY,low,high,left,right,frameLeft,frameRight,frameTop};
  }
  root.ProjectionEngine={possibilities,qualification,projected,ranked,defaultResults,bubbleLayout,playoff};
})(typeof window==='undefined'?globalThis:window);
