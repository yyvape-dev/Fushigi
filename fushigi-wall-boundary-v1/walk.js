// Review route through lower, left, upper edges and the bent corridor.
(function(){let walking=false;WallKitStudy.walk=async function(){
 if(walking)return;walking=true;player.x=player.vx=3;player.y=player.vy=9;
 const route=[[3,9],[3,8],[3,7],[3,6],[3,5],[3,4],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[8,4],[8,5],[9,5],[10,5],[11,5],[11,6],[11,7],[12,7],[13,7],[14,7],[15,7],[16,7],[16,8],[16,9],[16,10],[16,11]];
 try{for(const [x,y]of route){const dx=x-player.x,dy=y-player.y;if(dx||dy)playerMove(dx,dy);render();await new Promise(resolve=>setTimeout(resolve,180));}}finally{walking=false;}
};})();
