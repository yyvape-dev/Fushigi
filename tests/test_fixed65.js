{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 scene='dungeon';
 assert(Math.abs(tilePitchY()/TS-Math.sin(65*Math.PI/180))<1e-12,'dungeon projection is fixed at 65 degrees');
 assert(Math.abs(CaveTerrain.pitch-tilePitchY()/TS)<1e-12,'terrain tiles and actors share the same projection');
 scene='town';assert(tilePitchY()===TS,'town coordinates remain unchanged');
 renderCfg();assert(!cfgListEl.innerHTML.includes('data-cfg="view3d"'),'3D mode is not offered');
 saveGame();const original=JSON.parse(localStorage.getItem(SAVE_KEY));
 original.view3dPref=2;localStorage.setItem(SAVE_KEY,JSON.stringify(original));view3dPref=2;
 assert(loadGame(),'legacy save can still be loaded');assert(view3dPref===0,'old 3D preference migrates to fixed 2D');
 saveGame();const saved=JSON.parse(localStorage.getItem(SAVE_KEY));
 assert(!('view3dPref' in saved),'retired renderer preference is not saved again');
 assert(JSON.stringify(saved.wh)===JSON.stringify(original.wh)&&saved.bank===original.bank,'legacy storage and bank preserved');
 console.log('ALL OK: fixed 65-degree terrain/entity projection, unchanged town, old 3D save migration and preserved storage');
}
