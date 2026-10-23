// Reproducible extraction only; never redraw or deform generated characters.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=__dirname,keys=['ninja','caster','mimic','summoner','charged','cannon','lord'];
const boxes=[[0,140,305,465],[305,140,340,465],[645,190,313,415],[960,190,294,415],[0,690,333,430]];
function components(c){
 const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data,W=c.width,H=c.height,labels=new Int32Array(W*H),out=[];
 for(let n=0;n<W*H;n++)if(!labels[n]&&p[n*4+3]>40){
  const id=out.length+1,q=[n];labels[n]=id;let x0=W,y0=H,x1=0,y1=0;
  for(let i=0;i<q.length;i++){const a=q[i],x=a%W,y=Math.floor(a/W);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(const b of [x>0?a-1:-1,x<W-1?a+1:-1,y>0?a-W:-1,y<H-1?a+W:-1])if(b>=0&&!labels[b]&&p[b*4+3]>40){labels[b]=id;q.push(b);}
  }out.push({id,count:q.length,box:[x0,y0,x1,y1]});
 }return {p,labels,out};
}
// Remove only magenta connected to the background; retain the caster's purple orb.
function removeBackground(c){
 const g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height),p=d.data,W=c.width,H=c.height,seen=new Uint8Array(W*H),q=[];
 const add=n=>{if(n<0||n>=W*H||seen[n])return;const j=n*4;if(p[j]>180&&p[j+2]>180&&p[j+1]<110){seen[n]=1;q.push(n);}};
 for(let x=0;x<W;x++){add(x);add((H-1)*W+x);}for(let y=0;y<H;y++){add(y*W);add(y*W+W-1);}
 for(let i=0;i<q.length;i++){const n=q[i],x=n%W,y=Math.floor(n/W);if(x)add(n-1);if(x<W-1)add(n+1);if(y)add(n-W);if(y<H-1)add(n+W);}
 for(const n of q)p[n*4+3]=0;
 g.putImageData(d,0,0);
}
(async()=>{
 fs.mkdirSync(path.join(root,'art'),{recursive:true});
 const original=await loadImage(path.join(root,'source-art/enemyC-original.png'));
 const full=createCanvas(original.width,original.height);full.getContext('2d').drawImage(original,0,0);removeBackground(full);
 const cc=components(full),major=cc.out.filter(o=>o.count>5000),records=[];
 for(let i=0;i<keys.length;i++){
  const key=keys[i];let c;
  if(i<5){
   const [x,y,w,h]=boxes[i],chosen=major.find(o=>o.box[0]>=x&&o.box[0]<x+w&&o.box[1]>=y&&o.box[1]<y+h);
   if(!chosen)throw Error('Missing '+key);
   const keep=new Set([chosen.id]);
   for(const o of cc.out)if(o.count>=4&&o.count<5000&&o.box[0]>=x&&o.box[2]<x+w&&o.box[1]>=y&&o.box[3]<y+h)keep.add(o.id);
   c=createCanvas(w,h);const g=c.getContext('2d'),d=g.createImageData(w,h);
   for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const from=(y+yy)*full.width+x+xx,to=yy*w+xx;if(keep.has(cc.labels[from]))d.data.set(cc.p.subarray(from*4,from*4+4),to*4);}
   g.putImageData(d,0,0);
  }else{const im=await loadImage(path.join(root,'source-art',key+'.png'));c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);}
  const cs=components(c),visible=cs.out.filter(o=>o.count>=4);let x0=c.width,y0=c.height,x1=0,y1=0;
  for(const {box:b} of visible){x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);x1=Math.max(x1,b[2]);y1=Math.max(y1,b[3]);}
  const w=x1-x0+1,h=y1-y0+1,s=Math.min(224/w,192/h),out=createCanvas(256,256),g=out.getContext('2d');
  g.imageSmoothingQuality='high';g.drawImage(c,x0,y0,w,h,128-w*s/2,224-h*s,w*s,h*s);
  const file='art/'+key+'.png',buf=out.toBuffer('image/png');fs.writeFileSync(path.join(root,file),buf);
  records.push({key,file,width:256,height:256,anchor:[128,224],view:'SE/right-facing three-quarter',source:i<5?'source-art/enemyC-original.png':'source-art/'+key+'.png',sourceBounds:[x0,y0,w,h],scale:s,sha256:crypto.createHash('sha256').update(buf).digest('hex')});
 }
 const hashes={};for(const f of fs.readdirSync(path.join(root,'source-art')))hashes[f]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'source-art',f))).digest('hex');
 const ref='../fushigi-equipment-v3/assets/hero-base/SE.png';
 fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({generator:'OpenAI image_gen',promptFile:'prompts.json',styleReference:ref,referenceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,ref))).digest('hex'),sourceHashes:hashes,frames:records},null,2)+'\n');
 const sheet=createCanvas(1024,512),g=sheet.getContext('2d');for(let i=0;i<keys.length;i++){const im=await loadImage(path.join(root,'art',keys[i]+'.png'));g.drawImage(im,i%4*256,Math.floor(i/4)*256);}
 fs.writeFileSync(path.join(root,'enemyC.png'),sheet.toBuffer('image/png'));
 console.log('Exported 7 RGBA base sprites and enemyC sheet; anchor (128,224).');
})();
