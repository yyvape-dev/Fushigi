// Register painted direction/pose sheets without mirroring or per-frame warping.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const P=__dirname,D=['S','SW','W','NW','N','NE','E','SE'],K=['ninja','caster','mimic','summoner','charged','cannon','lord'];
function cuts(a,n){const out=[0],size=a.length/n;for(let i=1;i<n;i++){let best=Math.round(i*size),score=Infinity;for(let j=Math.round((i-.24)*size);j<Math.round((i+.24)*size);j++){const s=a[j]*1000+Math.abs(j-i*size);if(s<score){score=s;best=j;}}out.push(best);}out.push(a.length);return out;}
function crop(c,x,y,w,h){const o=createCanvas(w,h);o.getContext('2d').drawImage(c,x,y,w,h,0,0,w,h);return o;}
function bbox(c){const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>48){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}if(x1<=x0)throw Error('Empty sprite');return[x0,y0,x1-x0+1,y1-y0+1];}
async function cells(file,rows,n=rows*4,cols=4){const im=await loadImage(path.join(P,file)),c=createCanvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);const a=g.getImageData(0,0,c.width,c.height).data,ys=new Array(c.height).fill(0);for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>80)ys[y]++;const Y=cuts(ys,rows),out=[];for(let r=0;r<rows;r++){const xs=new Array(c.width).fill(0);for(let y=Y[r];y<Y[r+1];y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>80)xs[x]++;const X=cuts(xs,cols);for(let j=0;j<cols&&out.length<n;j++){let o=crop(c,X[j],Y[r],X[j+1]-X[j],Y[r+1]-Y[r]);const b=bbox(o);o=crop(o,...b);out.push(o);}}return out;}
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
(async()=>{const catalog={frameSize:256,origin:[128,224],directions:D,monsters:{}},hashes={};let sw=[];if(fs.existsSync(path.join(P,'source-art/SW-fixed.png')))sw=await cells('source-art/SW-fixed.png',2,7);
 for(let i=0;i<K.length;i++){
  const k=K[i],idle=await cells(`source-art/${k}-idle.png`,2);if(sw.length){const replacement=sw[i],unit=median(idle.map(c=>c.height))/replacement.height;const resized=createCanvas(Math.round(replacement.width*unit),Math.round(replacement.height*unit));resized.getContext('2d').drawImage(replacement,0,0,resized.width,resized.height);idle[1]=resized;}
  if(k==='caster'){const im=await loadImage(path.join(P,'source-art/caster-SW-fixed.png')),c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);const b=bbox(c),unit=median(idle.map(c=>c.height))/b[3],o=createCanvas(Math.round(b[2]*unit),Math.round(b[3]*unit));o.getContext('2d').drawImage(c,...b,0,0,o.width,o.height);idle[1]=o;}
  let motion=[];const mf=`source-art/${k}-motion.png`;if(fs.existsSync(path.join(P,mf)))motion=await cells(mf,4);
  if(k==='cannon'&&motion.length){const fixed=await cells('source-art/cannon-cardinal-fixed.png',2,4,2),ratio=median(motion.slice(0,8).map(c=>c.height))/median(fixed.map(c=>c.height));for(let j=0;j<4;j++){const c=fixed[j],o=createCanvas(Math.round(c.width*ratio),Math.round(c.height*ratio));o.getContext('2d').drawImage(c,0,0,o.width,o.height);motion[8+[0,2,4,6][j]]=o;}}
  if(k==='summoner'&&motion.length){const im=await loadImage(path.join(P,'source-art/summoner-attack-S-fixed.png')),c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);const b=bbox(c),ratio=median(motion.slice(8).map(c=>c.height))/b[3],o=createCanvas(Math.round(b[2]*ratio),Math.round(b[3]*ratio));o.getContext('2d').drawImage(c,...b,0,0,o.width,o.height);motion[8]=o;}
  const unit=motion.length?median(idle.map(c=>c.height))/median(motion.slice(0,8).map(c=>c.height)):1;
  const all=idle.map(c=>({c,u:1})).concat(motion.map(c=>({c,u:unit}))),target=k==='lord'?204:k==='mimic'?156:k==='charged'?168:184;
  const scale=Math.min(target/median(idle.map(c=>c.height)),224/Math.max(...all.map(o=>o.c.width*o.u)),208/Math.max(...all.map(o=>o.c.height*o.u)));
  const dir=path.join(P,'runtime',k);fs.mkdirSync(dir,{recursive:true});const views={};
  const register=(c,u)=>{const o=createCanvas(256,256),g=o.getContext('2d'),s=scale*u;g.imageSmoothingQuality='high';g.drawImage(c,128-c.width*s/2,224-c.height*s,c.width*s,c.height*s);return o;};
  for(let j=0;j<8;j++){const d=D[j],base=register(idle[j],1),file=`runtime/${k}/${d}.png`;fs.writeFileSync(path.join(P,file),base.toBuffer('image/png'));views[d]={idle:file};
   if(motion.length){const atlas=createCanvas(512,256),g=atlas.getContext('2d');g.drawImage(register(motion[j],unit),0,0);g.drawImage(register(motion[j+8],unit),256,0);const f=`runtime/${k}/${d}-motion.png`;fs.writeFileSync(path.join(P,f),atlas.toBuffer('image/png'));views[d].motion=f;}
  }catalog.monsters[k]={motion:motion.length>0,scale,motionSourceScale:unit,views};
  const contact=createCanvas(1024,512),cg=contact.getContext('2d');for(let j=0;j<8;j++)cg.drawImage(await loadImage(path.join(P,views[D[j]].idle)),j%4*256,Math.floor(j/4)*256);fs.writeFileSync(path.join(P,`runtime/${k}/idle-reference.png`),contact.toBuffer('image/png'));
 }
 fs.writeFileSync(path.join(P,'runtime.json'),JSON.stringify(catalog,null,2)+'\n');
 for(const f of fs.readdirSync(path.join(P,'source-art'))){hashes[f]=crypto.createHash('sha256').update(fs.readFileSync(path.join(P,'source-art',f))).digest('hex');}
 fs.writeFileSync(path.join(P,'runtime-source-hashes.json'),JSON.stringify(hashes,null,2)+'\n');
 const refs={};for(const file of ['directional-generation.json','motion-generation.json','caster-direction-fix.json','cannon-direction-fix.json','summoner-motion-fixes.json']){const parsed=JSON.parse(fs.readFileSync(path.join(P,file)));for(const record of Array.isArray(parsed)?parsed:[parsed])for(const ref of record.references||[record.reference].filter(Boolean)){refs[ref]=crypto.createHash('sha256').update(fs.readFileSync(path.join(P,ref))).digest('hex');}}
 fs.writeFileSync(path.join(P,'runtime-reference-hashes.json'),JSON.stringify(refs,null,2)+'\n');
 console.log('Registered 7 families / 8 directions; painted walk and attack slots.');
})();
