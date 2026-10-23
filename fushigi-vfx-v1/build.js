// Rebuild the shipped VFX from the unmodified, attributed free source art.
const fs=require('fs'),path=require('path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=__dirname,output=path.join(root,'../assets/vfx');
async function tinted(input,name,color,size=128){
 const im=await loadImage(input),c=createCanvas(size,size),g=c.getContext('2d');
 g.drawImage(im,0,0,size,size);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,size,size);
 fs.writeFileSync(path.join(output,name+'.png'),c.toBuffer('image/png'));
}
async function main(){
 fs.mkdirSync(output,{recursive:true});
 const dir=path.join(root,'source-art/mikodrak/fx1_blue_topEffect');
 const files=fs.readdirSync(dir).filter(f=>f.endsWith('.png')).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 for(const gold of [false,true]){
  const c=createCanvas(128*files.length,256),g=c.getContext('2d');
  for(let i=0;i<files.length;i++){
   const im=await loadImage(path.join(dir,files[i]));g.drawImage(im,i*128+15,26,98,203);
  }
  if(gold){g.globalCompositeOperation='source-in';g.fillStyle='#ffe3a0';g.fillRect(0,0,c.width,c.height);}
  fs.writeFileSync(path.join(output,gold?'blessing.png':'transfer.png'),c.toBuffer('image/png'));
 }
 fs.copyFileSync(path.join(root,'source-art/Explosion25.png'),path.join(output,'explosion.png'));
 const k=n=>path.join(root,'source-art/kenney',n+'.png');
 for(const [name,input,color] of [['spark','star_06','#ffe5ad'],['ring','circle_03','#ffe5ad'],['gas','smoke_03','#a5a4df'],['dust','dirt_01','#baa388']])await tinted(k(input),name,color);
 console.log('Built 7 VFX images from licensed source art.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
