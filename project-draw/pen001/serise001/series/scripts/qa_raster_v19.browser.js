async () => {
 const {RasterPainting}=await import('./raster-paint.js?revision=19');
 const texture=document.createElement('canvas');texture.width=texture.height=100;
 const x=texture.getContext('2d');x.fillStyle='#342b20';x.fillRect(0,0,100,100);
 const mark={start:1,end:2,points:[[10,20],[40,20]],bounds:[0,0,100,100],width:6,phase:'ink'};
 const r=new RasterPainting([mark],[texture],{pixel_scale:1});
 const s={showWash:true,showInk:true,inkBleed:0};
 r.artwork(.5,s,null,0);const blank=r.sc.getImageData(0,0,100,100).data.every(v=>v===0);
 r.artwork(1.99999,s,null,0);const before=r.sc.getImageData(0,0,100,100).data.slice();
 r.artwork(2,s,null,0);const after=r.sc.getImageData(0,0,100,100).data;let changed=0;
 for(let i=3;i<after.length;i+=4)if(Math.abs(after[i]-before[i])>2)changed++;
 r.artwork(8,s,null,0);const unvisitedAlpha=r.sc.getImageData(80,80,1,1).data[3];
 const saved=sumukExport.settings;
 await sumukExport.configure({settings:{...saved,showBrush:false,revealOriginal:false,sound:false}});
 sumukExport.frame(10.9);const first=sumukExport.canvas.toDataURL();sumukExport.frame(40);sumukExport.frame(10.9);
 const rewindExact=first===sumukExport.canvas.toDataURL();
 let times=[];for(let i=0;i<24;i++){const t=performance.now();sumukExport.frame(20+i/30);sumukExport.canvas.getContext('2d').getImageData(0,0,1,1);times.push(performance.now()-t);}
 times.sort((a,b)=>a-b);
 const source=await fetch('../episodes/ep06/art/painting.json').then(r=>r.json());
 const result={blank_initial:blank,no_completion_fill:unvisitedAlpha===0,completion_changed_pixels:changed,rewind_exact:rewindExact,working_size:source.raster_paint.working_size,has_vector_paint:!!source.vector_paint,loaded_svg:performance.getEntriesByType('resource').some(x=>/ep06.*painting-vector|ep06.*drawing-vector/.test(x.name)),median_frame_ms:times[12],p95_frame_ms:times[22]};
 await sumukExport.configure({settings:saved});sumukExport.frame(0);
 if(!blank||unvisitedAlpha!==0||changed>10||!rewindExact||source.vector_paint||result.loaded_svg)throw Error(JSON.stringify(result));
 return result;
}
