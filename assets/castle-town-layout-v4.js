// One spatial contract drives the picture, footprints, doors and service positions.
(function(root){
 const art=root.CastleTownArt;
 const items=[];
 function building(id,kind,x,y,options={}){
  const a=art[kind],width=options.width||a.width/a.doorHeight*1.65;
  const item={id,kind,x,y,width,depth:options.depth||2.0,isTownProp:true,vx:x,vy:y,...options};
  items.push(item);return item;
 }
 building('inn','inn',14,20,{service:'inn',entrance:true,portOffsetX:-1});
 building('smith','smith',25,20,{service:'smith',worker:'smith'});
 building('deposit','deposit',36,20,{service:'deposit',worker:'depositor',portOffsetX:-1});
 building('market','stall',47,20,{width:5,service:'market',worker:'market',depth:1.6});
 building('lodge','lodge',43,34);
 building('castle','castle',30,8,{width:10,depth:2.8});
 building('cave','cave',53,8,{width:5.2,service:'dungeon',entrance:true});
 for(const [i,p]of [[8,10],[19,10],[42,10],[14,34],[14,42],[24,42],[43,42],[53,42],[53,34]].entries())building('house'+i,i%2?'house-blue':'house-red',p[0],p[1],{private:true});
 building('fountain','fountain',30,31,{width:5,depth:1.7,round:true});
 building('board','board',37,35,{width:3.2,depth:.8,service:'mercenary'});
 for(const [i,p]of [[4,5],[13,5],[23,5],[38,5],[47,5],[56,5],[5,17],[55,17],[5,30],[20,33],[40,29],[56,29],[5,43],[35,43]].entries())building('tree'+i,'tree',...p,{width:4.2,depth:.7,trunk:true});
 function decor(kind,points,width,rowSolid=false){for(const [i,p]of points.entries())building(kind+i,kind,...p,{width,depth:.7,trunk:!rowSolid,rowSolid});}
 decor('lamp',[[9,24],[20,24],[41,24],[52,24],[26,12],[34,12],[26,36],[34,36],[26,44],[34,44]],.85);
 decor('planter',[[24,27],[36,27],[9,21],[51,21]],2.4,true);
 decor('bench',[[25,31],[35,31]],2.4,true);
 decor('hedge',[[19,30],[41,38],[8,38],[48,38]],3,true);
 decor('pot',[[17,21],[28,21],[39,21],[50,21]],.8);
 decor('sign',[[33,24]],1.1);
 function bounds(item){
  const cx=item.x+.5,bottom=item.y+.88,half=item.trunk ? .42 : item.width*.47;
  return {left:cx-half,right:cx+half,top:bottom-item.depth,bottom};
 }
 function contains(item,x,y){
  const b=bounds(item),px=x+.5,py=y+.9;
  if(item.trunk)return x===item.x&&y===item.y;
  if(item.kind==='board'||item.rowSolid)return y===item.y&&px>b.left&&px<b.right;
  if(item.round){const rx=(b.right-b.left)/2,ry=(b.bottom-b.top)/2;return ((px-(b.left+b.right)/2)/rx)**2+((py-(b.top+b.bottom)/2)/ry)**2<1;}
  return px>b.left&&px<b.right&&py>b.top&&py<b.bottom;
 }
 const byId=id=>items.find(o=>o.id===id);
 const services=items.filter(o=>o.service).map(o=>({id:o.service,x:o.x+(o.portOffsetX||0),y:o.y+1,objectId:o.id}));
 const roads=[
  {x:27,y:3,w:7,h:43,kind:'street-main'},
  {x:5,y:21,w:50,h:6,kind:'street-main'},
  {x:4,y:10,w:52,h:4,kind:'street-side'},
  {x:5,y:34,w:51,h:4,kind:'street-side'},
  {x:5,y:43,w:51,h:3,kind:'street-side'},
  {x:8,y:12,w:4,h:33,kind:'street-side'},
  {x:49,y:12,w:4,h:33,kind:'street-side'}
 ];
 const plaza={x:23,y:25,w:15,h:8};
 function inside(r,x,y){return x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;}
 function surfaceAt(x,y){
  if(x<2||x>=58||y<3||y>=46)return 'lawn';
  if(inside(plaza,x,y))return 'plaza';
  const road=roads.find(r=>inside(r,x,y));if(road)return road.kind;
  if(items.some(o=>(o.service||o.private||o.id==='lodge'||o.id==='castle')&&Math.abs(x-o.x)<=o.width/2+1&&y>=o.y-1&&y<=o.y+2))return 'street-side';
  return 'lawn';
 }
 root.CastleTownLayout={version:4,items,byId,bounds,contains,services,art,roads,plaza,surfaceAt};
})(typeof window==='undefined'?globalThis:window);
