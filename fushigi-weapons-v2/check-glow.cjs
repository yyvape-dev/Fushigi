// Standalone regression: temporal emission, reduced motion, blade-only mask,
// bounded alpha and unchanged source/hilt. Run from repo root with Node.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
async function check(){
 let reduced=false;const context={document:{createElement:()=>createCanvas(1,1)},matchMedia:()=>({get matches(){return reduced;}})};
 vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/weapon-glow.js','utf8'),context);
 const report=[];
 for(const key of ['kamaitachi','skyblade','firesword']){
  const art=await loadImage(__dirname+'/assets/'+key+'.png'),mask=await loadImage(__dirname+'/emission/'+key+'.png');
  const original=createCanvas(192,256),og=original.getContext('2d');og.drawImage(art,0,0);const before=Buffer.from(og.getImageData(0,0,192,256).data);
  const fx=context.WeaponGlow.create(art,mask,key),g=fx.canvas.getContext('2d');fx.update(330);const a=Buffer.from(g.getImageData(0,0,192,256).data);
  assert.equal(fx.update(331),false,'same 33ms bucket should be cached');fx.update(825);const b=Buffer.from(g.getImageData(0,0,192,256).data);
  assert(!a.equals(b),key+' must pulse over time');assert(before.equals(Buffer.from(og.getImageData(0,0,192,256).data)),'source mutated');
  for(let y=200;y<256;y++)for(let x=0;x<192;x++){const n=(y*192+x)*4;assert.deepEqual([...b.subarray(n,n+4)],[...before.subarray(n,n+4)],key+' changed the hand/grip region');}
  const edge=[];for(let x=0;x<192;x++)edge.push(b[x*4+3],b[((255*192)+x)*4+3]);for(let y=0;y<256;y++)edge.push(b[y*192*4+3],b[(y*192+191)*4+3]);assert(Math.max(...edge)<=1,key+' clipped glow at canvas edge');
  reduced=true;fx.update(1000);const quiet=Buffer.from(g.getImageData(0,0,192,256).data);assert.equal(fx.update(2000),false);assert(quiet.equals(Buffer.from(g.getImageData(0,0,192,256).data)));assert.equal(context.WeaponGlow.animating(key),false);reduced=false;
  report.push({key,pulse:true,sourceUnchanged:true,gripUnchanged:true,reducedMotion:true,boundedGlow:true});
 }
 console.log(JSON.stringify(report,null,2));console.log('ALL OK weapon glow');return report;
}
module.exports=check;if(require.main===module)check().catch(e=>{console.error(e);process.exitCode=1;});
