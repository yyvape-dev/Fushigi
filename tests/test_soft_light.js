{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 const size=32,width=480,height=360,canvas=__require('@napi-rs/canvas').createCanvas(width,height),g=canvas.getContext('2d');
 const map=Array.from({length:12},()=>Array(16).fill(0)),grid=map.map(r=>r.map(()=>-1));
 for(let y=2;y<9;y++)for(let x=2;x<12;x++){map[y][x]=1;grid[y][x]=0;}
 const options={width,height,size,pitch:size,camX:0,camY:0,player:{vx:7,vy:5,st:{}},rooms:[{x:2,y:2,w:10,h:7}],roomIndex:0,roomGrid:grid,map,theme:'limestone',revision:101};
 DungeonExperience.fog(g,options);
 const alpha=(x,y)=>DungeonExperience.layers.shade.getContext('2d').getImageData(x,y,1,1).data[3];
 const values=[32,48,64,80,96,112].map(x=>alpha(x,176));
 assert(values.every((a,i)=>!i||a<=values[i-1]),'room edge fades smoothly inward');
 assert(new Set(values).size>=5&&values[0]>values[5],'room edge has multiple intermediate brightness levels');
 assert(alpha(256,48)<45,'one-tile outside ring lights the head of a north-edge shopkeeper');
 assert(alpha(256,16)>alpha(256,48)+30,'light still fades beyond the extra tile ring');
 const before=g.getImageData(0,0,width,height).data.slice();g.clearRect(0,0,width,height);DungeonExperience.fog(g,options);
 assert(Buffer.from(before).equals(Buffer.from(g.getImageData(0,0,width,height).data)),'cached lighting matches first draw');
 for(let y=2;y<6;y++)for(let x=2;x<6;x++){map[y][x]=0;grid[y][x]=-1;}
 options.revision++;DungeonExperience.fog(g,options);
 assert(alpha(96,96)>alpha(288,224)+60,'L-shaped room cutout stays darker than its floor');
 console.log('ALL OK: feathered room boundary and lighting cache',values);
}
