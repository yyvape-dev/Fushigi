const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const url=process.env.FUSHIGI_TEST_URL||'http://127.0.0.1:8765/index.html';
  await page.goto(url);await page.waitForFunction(()=>typeof PotSystem!=='undefined'&&typeof bagClick==='function');
  const setup=async()=>page.evaluate(()=>{
   EventVfx.reset();closeBag();scene='dungeon';dungeonId='first';floorNo=3;newFloor();
   enemies=[];traps=[];floorItems=[];eqWeapon=eqShield=null;eqRings=[null,null];dead=false;turn=0;
   player.st=newStatus();player.hp=player.maxhp=100;belly=100;
   const pot=mkItem('fusepot',4),spare=mkItem('bread'),base=mkItem('sword',2),material=mkItem('kamaitachi',1);
   inv=[pot,spare,base,material];window.__potCheck={pot,spare,base,material};potOpen(pot,'put');
   return {base:base.id,material:material.id};
  });
  for(const confirm of ['button','dock']){
   const ids=await setup();
   await page.locator(`[data-act="pottoggle"][data-type="item:${ids.base}"]`).first().click();
   await page.locator(`[data-act="pottoggle"][data-type="item:${ids.material}"]`).first().click();
   const primary=page.locator('#bagDetail [data-act]').first();
   if(await primary.textContent()!=='選択した2個を入れる')throw Error('batch must be the primary displayed action');
   if(confirm==='button')await primary.click();
   else {await page.locator('#menuDock [data-nav="Enter"]').click();await page.locator('#menuDock [data-nav="Enter"]').click();}
   const ok=await page.evaluate(()=>{const {pot,spare,base,material}=__potCheck;return inv.includes(spare)&&!inv.includes(base)&&!inv.includes(material)&&pot.pot.length===1&&pot.pot[0]===base&&base.plus===3&&PotSystem.free(pot)===2&&turn===1;});
   if(!ok)throw Error('wrong items inserted via '+confirm);
   console.log('ALL OK: native checkbox clicks and '+confirm+' confirm preserve exact selected items');
  }
  await page.close();
  for(const name of ['test_controls_ui','test_pot_selection']){
   const p=await browser.newPage();await p.goto(url);
   p.on('console',m=>{if(m.text().includes('ALL OK'))console.log(m.text());});
   await p.evaluate(fs.readFileSync('tests/'+name+'.js','utf8'));await p.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
