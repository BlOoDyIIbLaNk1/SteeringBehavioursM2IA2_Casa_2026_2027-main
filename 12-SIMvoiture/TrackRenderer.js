// Cache du décor statique uniquement. Pas de force ou d'entité supplémentaire.
class TrackRenderer {
  draw(context,track,checkpointsVisible,simulation) {
    const caption=!track.recipe ? `${simulation instanceof Evolution ? simulation.generation : 'RACE'}` : '';
    if(this.track!==track || this.checkpoints!==checkpointsVisible || this.caption!==caption) {
      this.track=track;this.checkpoints=checkpointsVisible;this.caption=caption;
      context.fillStyle='#1c302b';context.fillRect(0,0,1200,760);
      context.fillStyle='#ffffff04';
      for(let y=0;y<760;y+=64)context.fillRect(0,y,1200,32);
      context.fillStyle='#98b69b18';
      for(let x=24;x<1200;x+=32)for(let y=20;y<760;y+=32)context.fillRect(x,y,1,1);
      track.show(checkpointsVisible);
      if(!track.recipe) {
        context.save();context.textAlign='center';context.fillStyle='#56656d';context.font='11px monospace';
        context.fillText('NEURAL PROVING GROUND',600,330);
        context.fillStyle='#9ca58e';context.font='42px system-ui';context.fillText(track.name.toUpperCase(),600,385);
        context.fillStyle='#65737b';context.font='10px monospace';
        context.fillText(`${simulation instanceof Evolution ? `GEN ${String(simulation.generation).padStart(3,'0')}` : 'RACE'} / ${Math.round(track.length)} PX / ${track.checkpoints.length} CP`,600,418);
        context.restore();
      }
      if(!this.canvas) {this.canvas=document.createElement('canvas');this.canvas.width=1200;this.canvas.height=760;}
      this.canvas.getContext('2d').drawImage(context.canvas,0,0);
    } else context.drawImage(this.canvas,0,0);
  }
}
