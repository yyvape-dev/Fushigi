// Keep original generated PNGs intact; export a smaller alpha title and a
// consistently sized 8-frame mist atlas for runtime cross-fades.
const fs=require('fs'),path=require('path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
async function main(){
 const title=await loadImage(path.join(__dirname,'source-art/title-crimson.png'));
 const c=createCanvas(1152,768);c.getContext('2d').drawImage(title,0,0,1152,768);
 fs.writeFileSync(path.join(__dirname,'art/title.png'),c.toBuffer('image/png'));
 const source=await loadImage(path.join(__dirname,'source-art/mist-eight-frames.png'));
 const atlas=createCanvas(512*8,320),g=atlas.getContext('2d');
 const sw=source.width/4,sh=source.height/2;
 for(let i=0;i<8;i++)g.drawImage(source,i%4*sw,Math.floor(i/4)*sh,sw,sh,i*512,0,512,320);
 fs.writeFileSync(path.join(__dirname,'art/mist.png'),atlas.toBuffer('image/png'));
 console.log('Generated artwork exported with transparent alpha.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
