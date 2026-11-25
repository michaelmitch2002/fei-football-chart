(function(){
  'use strict';
  const D=projectionData,E=ProjectionEngine,storageKey='fei-projection-week12-v3';
  const mainIds=new Set(D.games.map(g=>g.id));
  const state={version:3,benchmark:1,feiWeight:.5,headToHead:true,results:E.defaultResults(D),answers:{},championships:{}};
  try{
    const saved=JSON.parse(localStorage.getItem(storageKey)||localStorage.getItem('fei-projection-week12-v2')||localStorage.getItem('fei-projection-week12-v1')||'null');
    if(saved){
      if([0,1,2].includes(saved.benchmark))state.benchmark=saved.benchmark;
      if(Number.isFinite(saved.feiWeight) && saved.feiWeight>=0 && saved.feiWeight<=1)state.feiWeight=saved.feiWeight;
      if(typeof saved.headToHead==='boolean')state.headToHead=saved.headToHead;
      let defaultsChanged=false;
      for(const game of [...D.games,...Object.values(D.championshipGames)]){
        let winner=saved.results?.[game.id];
        if(saved.version!==3 && winner===game.feiFavorite && winner!==game.favorite){winner=game.favorite;defaultsChanged=true;}
        if(winner==='' || [game.away,game.home].includes(winner))state.results[game.id]=winner;
      }
      for(const c of defaultsChanged?[]:D.conferences){
        let pairs=E.possibilities(c,state.results),answers={};
        for(const team of c.tracked){
          const answer=saved.answers?.[c.name]?.[team];
          if(['yes','no'].includes(answer) && pairs.some(p=>p.teams.includes(team)===(answer==='yes'))){answers[team]=answer;pairs=E.possibilities(c,state.results,answers);}
        }
        state.answers[c.name]=answers;
        if(pairs.some(p=>p.id===saved.championships?.[c.name]))state.championships[c.name]=saved.championships[c.name];
      }
    }
  }catch{}
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}}
  function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  function teamNode(team){
    const n=el('span',undefined,'team'),url=personalLogos[team];
    if(url){const img=el('img');img.src=url;img.alt='';img.loading='lazy';img.addEventListener('error',()=>{img.hidden=true;});n.append(img);}
    n.append(el('span',team));return n;
  }
  function select(id,label,options,value,handler){
    const box=el('div',undefined,'question'),l=el('label',label),s=el('select');l.htmlFor=id;s.id=id;
    for(const [v,text] of options){const o=el('option',text);o.value=v;s.append(o);}
    s.value=value||'';s.addEventListener('change',()=>handler(s.value));box.append(l,s);return box;
  }
  function winnerControl(game,id,handler){
    const source=game.favoriteSource,vegas=source.kind==='vegas';
    const suffix=vegas?' · Vegas favorite':' · FEI fallback';
    const spread=vegas?' ('+String(source.spread).replace('-','−')+')':'';
    const box=select(id,'Winner · '+(vegas?'Vegas':'FEI')+' favorite: '+game.favorite+spread,[['','Leave unselected'],[game.away,game.away+(game.favorite===game.away?suffix:'')],[game.home,game.home+(game.favorite===game.home?suffix:'')]],state.results[game.id],handler);
    const note=el('small');
    if(vegas){const link=el('a',source.name+' line');link.href=source.url;note.append(link,el('span',' · as of November 25, 2026'));}
    else note.textContent='FEI fallback · no verified game line available for this matchup and venue.';
    box.append(note);return box;
  }
  function clearConference(c){
    state.answers[c.name]={};delete state.championships[c.name];
    for(const row of c.rows)for(const p of row.matchups)delete state.results[p.id];
  }
  function renderGames(){
    const container=document.getElementById('projection-games');container.replaceChildren();
    D.games.forEach((g,i)=>{
      const card=el('section',undefined,'game'),heading=el('h3',undefined,'matchup');
      heading.append(teamNode(g.away),el('span',g.neutral?'vs.':'at'),teamNode(g.home));
      card.append(heading,el('small',new Date(g.date).toLocaleDateString('en-US',{month:'long',day:'numeric',timeZone:'America/New_York'})));
      card.append(winnerControl(g,'regular-'+i,winner=>{
        state.results[g.id]=winner;
        D.conferences.filter(c=>c.gameIds.includes(g.id)).forEach(clearConference);
        renderConferences();renderProjection();save();
      }));container.append(card);
    });
  }
  function renderConferences(){
    const container=document.getElementById('projection-conferences');container.replaceChildren();
    D.conferences.forEach((c,i)=>{
      const card=el('section',undefined,'conference');card.append(el('h3',c.name),el('small',c.date));
      const link=el('a','Qualification source');link.href=c.source;
      const source=el('p',undefined,'muted');source.append(link);card.append(source);
      const missing=c.gameIds.filter(id=>mainIds.has(id) && !state.results[id]);
      if(missing.length){
        card.append(el('p','Choose '+missing.map(id=>{const g=D.games.find(g=>g.id===id);return g.away+'–'+g.home;}).join(', ')+' above to determine available berths.'));
        container.append(card);return;
      }
      let answers=state.answers[c.name]||{},pairs=E.possibilities(c,state.results,answers);
      if(!pairs.length){clearConference(c);answers={};pairs=E.possibilities(c,state.results);}
      const original=E.possibilities(c,state.results);
      for(const [j,team] of c.tracked.entries()){
        const status=E.qualification(original,team),current=E.qualification(pairs,team);
        if(status==='in'){card.append(el('p',team+' qualifies automatically.'));continue;}
        if(status==='out'){card.append(el('p',team+' is eliminated under your selected results.'));continue;}
        const otherAnswers={...answers};delete otherAnswers[team];
        const viable=E.possibilities(c,state.results,otherAnswers);
        const options=[['','Choose qualification']];
        if(viable.some(p=>p.teams.includes(team)))options.push(['yes','Yes — qualifies']);
        if(viable.some(p=>!p.teams.includes(team)))options.push(['no','No — misses the game']);
        if(options.length===2 && !answers[team]){card.append(el('p',team+(current==='in'?' qualifies':' is excluded')+' based on your other answers.'));continue;}
        card.append(select('qualify-'+i+'-'+j,'Does '+team+' make the championship game?',options,answers[team],answer=>{
          const next={...answers};if(answer)next[team]=answer;else delete next[team];
          state.answers[c.name]=next;delete state.championships[c.name];
          for(const p of original)delete state.results[p.id];
          renderConferences();renderProjection();save();
        }));
      }
      const questions=c.tracked.some(t=>E.qualification(pairs,t)==='conditional');
      if(questions){card.append(el('p','Other game results or tiebreaker ratings still matter. Resolve the qualification questions to continue.','muted'));container.append(card);return;}
      const active=pairs.filter(p=>p.teams.some(t=>c.tracked.includes(t)));
      if(!active.length){delete state.championships[c.name];card.append(el('p','No tracked team plays in this championship.'));container.append(card);return;}
      let chosen=state.championships[c.name];
      if(active.length===1){chosen=active[0].id;state.championships[c.name]=chosen;}
      else{
        if(!active.some(p=>p.id===chosen)){delete state.championships[c.name];chosen='';}
        const options=[['','Choose a feasible matchup and venue'],...active.map(p=>[p.id,p.teams.join(' vs. ')+(p.host?' · '+p.host+' hosts':' · neutral')])];
        card.append(select('matchup-'+i,'Other games / tiebreakers: which matchup occurs?',options,chosen,id=>{
          const old=state.championships[c.name];if(old)delete state.results[old];
          if(id)state.championships[c.name]=id;else delete state.championships[c.name];
          renderConferences();renderProjection();save();
        }));
      }
      if(chosen){
        const g=D.championshipGames[chosen],heading=el('p',undefined,'matchup');heading.append(teamNode(g.away),el('span',g.neutral?'vs.':'at'),teamNode(g.home));card.append(heading);
        if(!Object.prototype.hasOwnProperty.call(state.results,g.id))state.results[g.id]=g.favorite;
        card.append(winnerControl(g,'championship-winner-'+i,winner=>{
          state.results[g.id]=winner;renderProjection();save();
        }));
      }
      container.append(card);
    });
  }
  function renderProjection(){
    const rows=E.ranked(D,state.results,state.championships,state.benchmark,state.feiWeight,state.headToHead);
    const regular=D.games.filter(g=>state.results[g.id]).length;
    const titles=Object.values(state.championships).filter(id=>state.results[id]).length;
    document.getElementById('projection-status').textContent=regular+' of '+D.games.length+' regular-season games selected · '+titles+' championship results selected. Scores use all 138 FBS teams; playoff eligibility is limited to the 20 tracked contenders.';
    document.getElementById('projection-caption').textContent=['Elite','Good','Average'][state.benchmark]+' benchmark · '+(state.headToHead?'head-to-head applied':'score-only ranking')+' · Week 12 FEI ratings held fixed.';
    document.getElementById('projection-weights').textContent='FEI '+(state.feiWeight*100).toFixed(0)+'% · SOR '+((1-state.feiWeight)*100).toFixed(0)+'%';
    ProjectionChart.render(rows,D.tracked,state.headToHead);
    ProjectionPlayoff.render(D,rows,state.results,state.championships);
  }
  const benchmark=document.getElementById('projection-benchmark');benchmark.value=String(state.benchmark);
  benchmark.addEventListener('change',()=>{state.benchmark=Number(benchmark.value);renderProjection();save();});
  const weight=document.getElementById('projection-weight');weight.value=String(state.feiWeight*100);
  weight.addEventListener('input',()=>{state.feiWeight=Number(weight.value)/100;renderProjection();save();});
  const h2h=document.getElementById('projection-h2h');h2h.checked=state.headToHead;
  h2h.addEventListener('change',()=>{state.headToHead=h2h.checked;renderProjection();save();});
  document.getElementById('clear-projection').addEventListener('click',()=>{state.results=E.defaultResults(D);state.answers={};state.championships={};renderGames();renderConferences();renderProjection();save();});
  renderGames();renderConferences();renderProjection();
})();
