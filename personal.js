(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const latestWeek = Object.keys(weeklyRatings).filter(week => weekSnapshots[week] && headToHeadSnapshots[week]).sort((a,b)=>Number(b)-Number(a))[0];
  const names = weeklyRatings[latestWeek].map(row => row[0]).sort((a,b) => a.localeCompare(b));
  const canonical = new Map(names.map(name => [name.toLowerCase(),name]));
  const benchmarkNames = ['Elite','Good','Average'];
  const storageKey = 'fei-personal-ranking-v1';
  let saved = {}, submitted = null, currentFits = [], worker = null, busy = false;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch {}
  const entryLogos = [], optionGroups = [], restoredTeams = new Set();
  function updateLogo(input,image) {
    const team=canonical.get(input.value.trim().toLowerCase());
    const url=team && personalLogos[team]; image.hidden=!url;
    if(url) image.src=url; else image.removeAttribute('src');
  }
  const inputs = Array.from({length:25},(_,i) => {
    const label = document.createElement('label'), title = document.createElement('span'), input = document.createElement('select');
    title.textContent = '#' + (i+1); input.id = 'personal-rank-' + (i+1); 
    input.setAttribute('aria-label','Team ranked number ' + (i+1)); input.required = true;
    const placeholder=document.createElement('option'); placeholder.value=''; placeholder.textContent='Choose a team'; placeholder.disabled=true; input.append(placeholder);
    const options=names.map(team=>{const option=document.createElement('option'); option.value=team; option.textContent=team; input.append(option); return option;}); optionGroups.push(options);
    const restored=typeof saved.teams?.[i] === 'string' ? canonical.get(saved.teams[i].trim().toLowerCase()) : null;
    input.value=restored && !restoredTeams.has(restored) ? restored : ''; if(input.value) restoredTeams.add(input.value);
    const image=document.createElement('img'); image.className='entry-logo'; image.alt=''; image.setAttribute('aria-hidden','true');
    image.addEventListener('error',()=>{image.hidden=true;}); entryLogos.push(image); updateLogo(input,image);
    label.append(title,input,image); $('rank-inputs').append(label); return input;
  });
  function updateChoices() {
    const selected=new Set(inputs.map(input=>input.value).filter(Boolean));
    inputs.forEach((input,i)=>optionGroups[i].forEach(option=>{option.disabled=selected.has(option.value)&&option.value!==input.value;}));
  }
  updateChoices();
  function saveDraft() {
    try { localStorage.setItem(storageKey,JSON.stringify({week:latestWeek,teams:inputs.map(input=>input.value)})); $('draft-status').textContent='Draft saved in this browser'; }
    catch { $('draft-status').textContent='Browser storage unavailable; keep this page open to retain your draft'; }
    if (submitted) $('progress').textContent='Your entries changed. Submit again to update the results.';
  }
  inputs.forEach((input,i) => input.addEventListener('change',()=>{updateChoices();updateLogo(input,entryLogos[i]);saveDraft();}));
  function error(message) { $('form-error').textContent=message; $('form-error').hidden=false; }
  function setBusy(value) {
    busy=value; $('submit-ranking').disabled=value;
    inputs.forEach(input=>input.disabled=value); $('personal-form').setAttribute('aria-busy',String(value));
  }
  // Run the exact chart optimizer in a worker so the entry form remains responsive.
  const workerSource = [buildScores,applyHeadToHead,rankMSE,fitWeight].map(fn=>fn.toString()).join('\n') + `
    self.onmessage = ({data}) => {
      try {
        const wins = new Set(data.games.map(([winner,loser])=>winner+'\\u0000'+loser));
        const fits=[];
        for(let benchmark=1;benchmark<=3;benchmark++) for(const h2h of [false,true]) {
          fits.push({...fitWeight(data.ratings,data.records,data.teams,benchmark,h2h?wins:null),benchmark,h2h});
          self.postMessage({progress:fits.length});
        }
        self.postMessage({fits});
      } catch(error) { self.postMessage({error:error.message}); }
    };`;
  function cell(row,text,tag='td') { const element=document.createElement(tag); element.textContent=text; row.append(element); return element; }
  const percent = value => (value*100).toFixed(2)+'%';
  function fitLabel(fit) { return benchmarkNames[fit.benchmark-1]+' · '+(fit.h2h?'Head-to-head':'Score-only'); }
  function compare() {
    const fit=currentFits[Number($('fit-choice').value)]; if (!fit || !submitted) return;
    let rows=buildScores(weeklyRatings[submitted.week],weekSnapshots[submitted.week].record,fit.weight,fit.benchmark);
    if (fit.h2h) rows=applyHeadToHead(rows,headToHeadSnapshots[submitted.week]);
    const ranks=new Map(rows.map(row=>[row.team,row.rank]));
    const body=$('rank-comparison').querySelector('tbody'); body.replaceChildren();
    submitted.teams.forEach((team,i)=>{
      const row=document.createElement('tr'), difference=ranks.get(team)-(i+1);
      cell(row,String(i+1)); const teamCell=cell(row,''); const teamName=document.createElement('span'); teamName.className='team-name';
      if(personalLogos[team]) { const logo=document.createElement('img'); logo.src=personalLogos[team]; logo.alt=''; logo.addEventListener('error',()=>logo.hidden=true); teamName.append(logo); }
      const name=document.createElement('span'); name.textContent=team; teamName.append(name); teamCell.append(teamName); cell(row,String(ranks.get(team))); cell(row,(difference>0?'+':'')+difference); body.append(row);
    });
    $('comparison-caption').textContent=fitLabel(fit)+' · FEI '+percent(1-fit.weight)+' · SOR '+percent(fit.weight)+'. Positive difference means the fitted model ranks the team lower than you do.';
  }
  function render(fits) {
    currentFits=fits;
    const minimum=Math.min(...fits.map(fit=>fit.mse));
    const winners=fits.filter(fit=>Math.abs(fit.mse-minimum)<1e-10);
    $('best-summary').textContent=(winners.length>1?'Equally closest matches: ':'Closest match: ')+winners.map(fit=>fitLabel(fit)+' — FEI '+percent(1-fit.weight)+', SOR '+percent(fit.weight)).join('; ')+'. MSE '+minimum.toFixed(2)+'.';
    $('result-context').textContent='Based on your submitted Week '+submitted.week+' top 25. Lower MSE means closer alignment with your order. Inputs use all 138 FBS teams.';
    const body=$('fit-table').querySelector('tbody'); body.replaceChildren(); $('fit-choice').replaceChildren();
    fits.forEach((fit,index)=>{
      const best=Math.abs(fit.mse-minimum)<1e-10, row=document.createElement('tr');
      if(best) row.classList.add('best');
      cell(row,benchmarkNames[fit.benchmark-1]); cell(row,fit.h2h?'Head-to-head':'Score-only'); cell(row,percent(1-fit.weight)); cell(row,percent(fit.weight)); cell(row,fit.mse.toFixed(2)); cell(row,best?'Closest match':''); body.append(row);
      const option=document.createElement('option'); option.value=String(index); option.textContent=fitLabel(fit)+(best?' · Closest match':''); $('fit-choice').append(option);
    });
    $('fit-choice').value=String(fits.indexOf(winners[0])); compare(); $('personal-results').hidden=false;
    $('progress').textContent='All six fits complete. Your closest match is highlighted below.';
  }
  $('fit-choice').addEventListener('change',compare);
  $('personal-form').addEventListener('submit',event=>{
    event.preventDefault(); if(busy) return; $('form-error').hidden=true;
    const teams=inputs.map(input=>canonical.get(input.value.trim().toLowerCase()));
    const invalid=teams.findIndex(team=>!team);
    if(invalid>=0) { error('Choose a valid FBS team for #'+(invalid+1)+'.'); inputs[invalid].focus(); return; }
    const seen=new Set();
    for(let i=0;i<teams.length;i++) { if(seen.has(teams[i])) { error(teams[i]+' appears more than once. Select 25 different teams.'); inputs[i].focus(); return; } seen.add(teams[i]); }
    inputs.forEach((input,i)=>input.value=teams[i]); saveDraft();
    submitted={week:latestWeek,teams}; $('personal-results').hidden=true; setBusy(true);
    $('progress').textContent='Fitting your ranking across all three benchmarks and both rules…';
    try {
      if(worker) worker.terminate();
      const url=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}));
      try { worker=new Worker(url); } finally { URL.revokeObjectURL(url); }
      worker.onmessage=({data})=>{
        if(data.progress) $('progress').textContent='Fitting your ranking: '+data.progress+' of 6 complete…';
        if(data.fits) { setBusy(false); render(data.fits); worker.terminate(); worker=null; }
        if(data.error) { setBusy(false); error('The fit could not finish: '+data.error); $('progress').textContent=''; worker.terminate(); worker=null; }
      };
      worker.onerror=()=>{ setBusy(false); error('The fit could not run in this browser. Please try again in an updated browser.'); $('progress').textContent=''; worker?.terminate(); worker=null; };
      worker.postMessage({ratings:weeklyRatings[submitted.week],records:weekSnapshots[submitted.week].record,games:headToHeadSnapshots[submitted.week],teams});
    } catch { setBusy(false); error('The fit could not start in this browser. Your draft has been retained where browser storage is available.'); $('progress').textContent=''; }
  });
})();
