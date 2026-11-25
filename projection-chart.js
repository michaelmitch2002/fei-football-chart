(function(root){
  'use strict';
  let current=[],trackedTeams=[],observed=false;
  const svgNS='http://www.w3.org/2000/svg';
  function node(tag,attrs={},text){
    const n=document.createElementNS(svgNS,tag);
    for(const [key,value] of Object.entries(attrs))n.setAttribute(key,String(value));
    if(text!==undefined)n.textContent=text;return n;
  }
  function draw(){
    const container=document.getElementById('projection-bubbles');
    const width=Math.max(240,container.getBoundingClientRect().width||800);
    const shown=current.filter(r=>trackedTeams.includes(r.team));
    const groups=[{title:'CFP top 15',teams:trackedTeams.slice(0,15)},{title:'Group of 5 contenders',teams:trackedTeams.slice(15)}];
    container.replaceChildren();
    for(const group of groups){
      const heading=document.createElement('h3');heading.textContent=group.title;container.append(heading);
      const rows=shown.filter(r=>group.teams.includes(r.team));
      const layout=ProjectionEngine.bubbleLayout(rows,width,trackedTeams,shown);
      const svg=node('svg',{viewBox:'0 0 '+width+' '+layout.height,width:'100%',height:layout.height,role:'img','aria-label':group.title+': FEI plus SOR scores. Higher scores appear farther right. Vertical spacing prevents bubble overlap.'});
      svg.append(node('title',{},group.title+' · projected FEI + SOR'),node('desc',{},'Only the selected contender group is shown. Both graphs use the same horizontal score scale. Head-to-head changes ranks, not scores. Each logo identifies a team; its title includes rank and score.'));
      svg.append(node('rect',{'data-chart-frame':'',x:layout.frameLeft,y:layout.frameTop,width:layout.frameRight-layout.frameLeft,height:layout.axisY-layout.frameTop,fill:'none',stroke:'var(--line)'}));
      const count=width<400?3:8;
      for(let i=0;i<count;i++){
        const x=layout.left+i/(count-1)*(layout.right-layout.left),value=layout.low+i/(count-1)*(layout.high-layout.low);
        svg.append(node('line',{x1:x,x2:x,y1:layout.frameTop,y2:layout.axisY,stroke:'var(--line)'}));
        svg.append(node('text',{x,y:layout.axisY+20,'text-anchor':'middle',fill:'var(--ink)','font-size':12},value.toFixed(1)));
      }
      svg.append(node('text',{'class':'axis-title','data-axis':'x',x:(layout.frameLeft+layout.frameRight)/2,y:layout.axisY+46,'text-anchor':'middle',fill:'var(--ink)','font-size':12},'Combined rating · weighted z-score →'));
      svg.append(node('text',{'class':'axis-title','data-axis':'y',transform:'translate(18 '+((layout.frameTop+layout.axisY)/2)+') rotate(-90)','text-anchor':'middle',fill:'var(--ink)','font-size':12},'Teams · spacing only'));
      const zero=layout.left+(0-layout.low)/(layout.high-layout.low)*(layout.right-layout.left);
      svg.append(node('line',{'data-zero-reference':'',x1:zero,x2:zero,y1:layout.frameTop,y2:layout.axisY,stroke:'var(--ink)',opacity:.6}));
      for(const p of layout.points){
        const label=p.team+' · rank #'+p.rank+' · FEI + SOR '+p.score.toFixed(3)+' · FEI '+p.fei.toFixed(2)+' · SOR '+p.sor.toFixed(2);
        const mark=node('g',{'data-team':p.team,'aria-label':label});
        mark.append(node('title',{},label));
        mark.append(node('circle',{cx:p.x,cy:p.y,r:p.r,fill:'var(--bubble)','fill-opacity':.16,stroke:'var(--bubble)'}));
        if(personalLogos[p.team])mark.append(node('image',{href:personalLogos[p.team],x:p.x-11,y:p.y-11,width:22,height:22,preserveAspectRatio:'xMidYMid meet'}));
        svg.append(mark);
      }
      container.append(svg);
    }
  }
  root.ProjectionChart={render(rows,tracked){
    current=rows;trackedTeams=tracked;draw();
    if(!observed && typeof ResizeObserver!=='undefined'){new ResizeObserver(draw).observe(document.getElementById('projection-bubbles'));observed=true;}
  }};
})(typeof window==='undefined'?globalThis:window);
