(function(root){
  'use strict';
  function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  function teamRow(row,seed,out=false){
    const n=el('div',undefined,'bracket-team');n.append(el('span',(out?'#':'')+String(seed),'bracket-seed'));
    if(row){
      const img=el('img');img.src=personalLogos[row.team];img.alt='';img.loading='lazy';img.addEventListener('error',()=>{img.hidden=true;});
      n.append(img,el('span',row.team,'bracket-name'));
      if(row.bid!=='At-large')n.append(el('small','AQ','bracket-aq'));
      n.title=row.team+(out?' · outside the field':' · seed '+seed)+' · model rank #'+row.rank+' · '+row.bid;
    }else n.append(el('span','To be determined','bracket-name muted'));
    return n;
  }
  function placeholder(text){return el('div',text,'bracket-placeholder muted');}
  root.ProjectionPlayoff={render(data,rows,results,championships){
    const model=ProjectionEngine.playoff(data,rows,results,championships),container=document.getElementById('projection-playoff');container.replaceChildren();
    const status=document.getElementById('playoff-status');
    status.textContent=model.ready?'Projected 12-team field from the 20 tracked contenders, using your FEI + SOR ranking and selected championship winners. AQ marks an automatic qualifier within this pool.':'Complete the championship matchup and winner selections for '+model.missing.join(', ')+' above to determine the contender-only playoff field and first two teams out.';
    const bySeed=new Map(model.field.map(r=>[r.seed,r]));
    const rounds=['First round','Quarterfinals','Semifinals','National championship'].map(title=>{
      const round=el('section',undefined,'bracket-round');round.append(el('h3',title));const games=el('div',undefined,'bracket-round-games');round.append(games);container.append(round);return games;
    });
    const card=(round,row,title,route)=>{
      const n=el('div',undefined,'bracket-match '+(route||''));n.style.gridRow=row+' / span 2';n.append(el('small',title,'bracket-game-label'));rounds[round].append(n);return n;
    };
    const paths=[{high:8,low:9,bye:1},{high:5,low:12,bye:4},{high:7,low:10,bye:2},{high:6,low:11,bye:3}];
    paths.forEach((p,i)=>{
      const first=card(0,1+i*2,p.high+' vs. '+p.low+' · higher seed hosts','route-straight');first.append(teamRow(bySeed.get(p.high),p.high),teamRow(bySeed.get(p.low),p.low));
      const quarter=card(1,1+i*2,'Quarterfinal '+(i+1),'route-'+(i%2?'up':'down'));quarter.append(teamRow(bySeed.get(p.bye),p.bye),placeholder('Winner of '+p.high+' / '+p.low));
    });
    const firstSemi=card(2,2,'Semifinal 1','has-entry route-long-down');firstSemi.append(placeholder('Winner of quarterfinal 1'),placeholder('Winner of quarterfinal 2'));
    const secondSemi=card(2,6,'Semifinal 2','has-entry route-long-up');secondSemi.append(placeholder('Winner of quarterfinal 3'),placeholder('Winner of quarterfinal 4'));
    const final=card(3,4,'National championship','has-entry');final.append(placeholder('Winner of semifinal 1'),placeholder('Winner of semifinal 2'));
    const outside=document.getElementById('playoff-first-out');outside.replaceChildren();
    for(let i=0;i<2;i++){
      const entry=el('div',undefined,'first-out-team');entry.append(el('small',i===0?'First team out':'Second team out'));
      const r=model.firstOut[i];
      if(r){const team=teamRow({...r,bid:'At-large'},r.rank,true);team.append(el('small','Score '+r.score.toFixed(3)));entry.append(team);}
      else entry.append(el('p','Awaiting championship selections','muted'));
      outside.append(entry);
    }
  }};
})(typeof window==='undefined'?globalThis:window);
