'use strict';
const directions=['S','SW','W','NW','N','NE','E','SE'];
const labels={S:'正面',SW:'左斜め前',W:'左',NW:'左斜め後ろ',N:'後ろ',NE:'右斜め後ろ',E:'右',SE:'右斜め前'};
const images={lana:{},avenius:{},aveniusMotion:{}},cards=[];
let metadata,timer=null;
const selector=document.getElementById('direction');
function loadImage(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(url));im.src=url;});}
function cross(g,x,y){g.strokeStyle='#e9c980';g.lineWidth=1;g.beginPath();g.moveTo(x-7,y);g.lineTo(x+7,y);g.moveTo(x,y-5);g.lineTo(x,y+5);g.stroke();}
function body(g,kind,d,x,y,s){const action=document.getElementById('action').value,phase=Date.now()%400,moving=kind==='avenius'&&(action==='walk'?Math.floor(phase/100)%2===0:action==='attack'&&phase>=35&&phase<240),im=moving?images.aveniusMotion[d]:images[kind][d],width=moving?320:256,sx=moving&&action==='attack'?320:0,anchor=moving?[160,224]:[128,224];g.drawImage(im,sx,0,width,256,x-anchor[0]*s,y-anchor[1]*s,width*s,256*s);}
function floor(g,w,y,tile){g.fillStyle='#ffffff05';g.fillRect(0,y-tile*.45,w,tile*.9);g.strokeStyle='#ffffff19';g.lineWidth=1;g.beginPath();for(let x=0;x<w;x+=tile){g.moveTo(x,y-tile*.45);g.lineTo(x,y+tile*.45);}g.moveTo(0,y-tile*.45);g.lineTo(w,y-tile*.45);g.moveTo(0,y+tile*.45);g.lineTo(w,y+tile*.45);g.stroke();}
function render(){if(!metadata)return;const d=selector.value,canvas=document.getElementById('comparison'),g=canvas.getContext('2d'),height=Number(document.getElementById('size').value),s=height/192,ground=294,show=document.getElementById('guides').checked;
 const width=Math.max(document.getElementById('action').value!=='idle'&&height===192?520:0,Math.min(720,canvas.parentElement.clientWidth)),lx=width*(width<480?.28:.32),ax=width*(width<480?.73:.68);canvas.width=width;canvas.style.width=width+'px';
 g.clearRect(0,0,width,370);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';floor(g,width,ground,height/1.5);
 if(show){g.save();g.setLineDash([5,5]);g.strokeStyle='#c7d7d277';g.beginPath();g.moveTo(14,ground);g.lineTo(width-14,ground);g.moveTo(14,ground+(metadata.lanaCrownY-224)*s);g.lineTo(width-14,ground+(metadata.lanaCrownY-224)*s);g.stroke();g.restore();}
 body(g,'lana',d,lx,ground,s);body(g,'avenius',d,ax,ground,s);if(show){cross(g,lx,ground);cross(g,ax,ground);}
 g.fillStyle='#f1e4d2';g.font='16px system-ui';g.textAlign='center';g.fillText('ラナ',lx,341);g.fillText('アベニウス',ax,341);g.font='12px system-ui';g.fillStyle='#abc7c8';g.fillText(d+' · '+labels[d],width/2,24);
 for(const card of cards){const c=card.g;c.clearRect(0,0,320,286);floor(c,320,242,100);body(c,'avenius',card.d,160,242,1);if(show)cross(c,160,242);}
 document.getElementById('status').textContent='8方向を読み込みました。'+(height===96?'本編の基準サイズ':'2倍の拡大表示')+' · 身体と足元を基準に登録';
 window.AveniusPreviewState={ready:true,direction:d,height,ground,scale:s,action:document.getElementById('action').value};
}
for(const d of directions){const el=document.createElement('figure');el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',labels[d]+'を比較');el.innerHTML='<figcaption>'+d+' · '+labels[d]+'</figcaption><canvas width="320" height="286"></canvas>';document.getElementById('views').append(el);cards.push({d,g:el.querySelector('canvas').getContext('2d')});const choose=()=>{selector.value=d;render();};el.onclick=choose;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};}
for(const id of ['direction','size','guides','action'])document.getElementById(id).addEventListener('change',render);
setInterval(()=>{if(metadata&&Object.keys(images.aveniusMotion).length===8&&document.getElementById('action').value!=='idle'&&!document.hidden)render();},70);
window.addEventListener('resize',render);
function stop(){clearInterval(timer);timer=null;document.getElementById('rotate').textContent='方向を順に見る';document.getElementById('rotate').setAttribute('aria-pressed','false');}
document.getElementById('rotate').onclick=()=>{if(timer){stop();return;}timer=setInterval(()=>{selector.value=directions[(directions.indexOf(selector.value)+1)%8];render();},850);document.getElementById('rotate').textContent='停止';document.getElementById('rotate').setAttribute('aria-pressed','true');};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
Promise.all([fetch('ally.json').then(r=>{if(!r.ok)throw new Error('ally.json');return r.json();}).then(m=>metadata=m),...directions.flatMap(d=>[loadImage('../fushigi-equipment-v3/assets/hero-base/'+d+'.png').then(im=>images.lana[d]=im),loadImage('assets/'+d+'.png').then(im=>images.avenius[d]=im),loadImage('assets/'+d+'-motion.png').then(im=>images.aveniusMotion[d]=im)])]).then(render).catch(error=>{document.getElementById('status').textContent='画像を読み込めませんでした。再読み込みしてください。';console.error(error);});
