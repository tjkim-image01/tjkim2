(async()=>{
 const data=await fetch('../episodes/ep06/art/painting.json',{cache:'no-store'}).then(r=>r.json());
 const {RasterPainting}=await import('./raster-paint.js?revision=23');
 const marks=data.strokes.filter(m=>m.element==='background');
 const layers=await Promise.all(marks.map(async m=>{const i=new Image();i.src='../episodes/ep06/art/'+m.file;await i.decode();return i;}));
 const r=new RasterPainting(marks,layers,data.raster_paint),s={showWash:true,showInk:true,inkBleed:0};
 const locations=[[150,100],[550,100],[110,500],[200,330],[268,100]];
 const pixel=([x,y])=>Array.from(r.sc.getImageData(x*4,y*4,1,1).data);
 const colors=[];
 for(const [i,pass] of data.raster_paint.background_color_passes.entries()){
  r.artwork(pass.start-.001,s,null,0);const before=pixel(locations[i]);
  r.artwork(pass.end,s,null,0);const after=pixel(locations[i]);
  const reloaded=r.motionAt(pass.start-.1,1).penup;
  colors.push({pigment:pass.pigment_id,before,after,reloaded});
  if(before[3]!==0||after[3]===0||!reloaded)throw Error(JSON.stringify(colors));
 }
 r.artwork(47,s,null,0);const first=r.surface.toDataURL();
 r.artwork(39,s,null,0);r.artwork(47,s,null,0);
 const rewind=first===r.surface.toDataURL();
 window.qaBackground=r.surface;
 if(!rewind)throw Error('Background rewind differs');
 return {version:data.raster_paint.version,colors,rewind_exact:rewind,background_strokes:marks.length};
})()
