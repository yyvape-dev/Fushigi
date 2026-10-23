const fs=require('fs'),path=require('path'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const P=__dirname,D=['S','SW','W','NW','N','NE','E','SE'];
(async()=>{for(const k of ['ninja','caster','mimic','summoner','charged','cannon','lord'])for(const mode of ['idle','motion']){
 const c=createCanvas(1024,mode==='idle'?512:1024),g=c.getContext('2d');
 for(let i=0;i<(mode==='idle'?8:16);i++){const pose=mode==='idle'?0:i<8?1:2,im=await loadImage(path.join(P,'guides',`${k}-${pose}-${D[i%8]}.png`));g.drawImage(im,i%4*256,Math.floor(i/4)*256);}
 fs.writeFileSync(path.join(P,'guides',`${k}-${mode}-sheet.png`),c.toBuffer('image/png'));
}})();
