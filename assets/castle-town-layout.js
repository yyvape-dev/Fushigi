// One spatial contract drives the picture, footprints, doors and service positions.
(function(root){
 const art=root.CastleTownArt;
 const items=[];
 function building(id,kind,x,y,options={}){
  const a=art[kind],width=options.width||a.width/a.doorHeight*1.65;
  const item={id,kind,x,y,width,depth:options.depth||2.0,isTownProp:true,vx:x,vy:y,...options};
  items.push(item);return item;
 }
 building('inn','inn',14,14,{service:'inn',entrance:true,portOffsetX:-1});
 building('smith','smith',14,29,{service:'smith',worker:'smith'});
 building('deposit','deposit',44,28,{service:'deposit',worker:'depositor',portOffsetX:-1});
 building('lodge','lodge',44,40);
 building('castle','castle',30,8,{width:10,depth:2.8});
 building('cave','cave',53,13,{width:5.2,service:'dungeon',entrance:true});
 for(const [i,p]of [[5,13],[5,27],[5,41],[24,14],[22,37],[32,43],[54,26],[54,39],[43,13]].entries())building('house'+i,i%2?'house-blue':'house-red',p[0],p[1],{private:true});
 building('market','stall',37,19,{width:5,service:'market',worker:'market',depth:1.6});
 building('fountain','fountain',30,27,{width:5,depth:1.7,round:true});
 building('board','board',38,39,{width:3.2,depth:.8,service:'mercenary'});
 for(const [i,p]of [[3,6],[9,6],[20,6],[38,6],[48,6],[56,6],[9,19],[21,23],[23,28],[36,28],[49,19],[50,33],[9,34],[15,39],[23,43],[39,44],[55,44],[3,33],[57,18],[3,19],[30,16]].entries())building('tree'+i,'tree',p[0],p[1],{width:4.2,depth:.7,trunk:true});
 function bounds(item){
  const cx=item.x+.5,bottom=item.y+.88,half=item.trunk ? .42 : item.width*.47;
  return {left:cx-half,right:cx+half,top:bottom-item.depth,bottom};
 }
 function contains(item,x,y){
  const b=bounds(item),px=x+.5,py=y+.9;
  if(item.trunk)return x===item.x&&y===item.y;
  if(item.kind==='board')return y===item.y&&px>b.left&&px<b.right;
  if(item.round){const rx=(b.right-b.left)/2,ry=(b.bottom-b.top)/2;return ((px-(b.left+b.right)/2)/rx)**2+((py-(b.top+b.bottom)/2)/ry)**2<1;}
  return px>b.left&&px<b.right&&py>b.top&&py<b.bottom;
 }
 const byId=id=>items.find(o=>o.id===id);
 const services=items.filter(o=>o.service).map(o=>({id:o.service,x:o.x+(o.portOffsetX||0),y:o.y+1,objectId:o.id}));
 const lawns=[{x:20,y:23,w:6,h:6},{x:34,y:25,w:6,h:7},{x:9,y:34,w:8,h:6},{x:48,y:34,w:4,h:9}];
 root.CastleTownLayout={version:3,items,byId,bounds,contains,services,art,lawns};
})(typeof window==='undefined'?globalThis:window);
