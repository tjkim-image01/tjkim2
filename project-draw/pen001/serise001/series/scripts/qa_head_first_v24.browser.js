(async()=>{
 const data=await fetch('../episodes/'+new URLSearchParams(location.search).get('ep')+'/art/painting.json',{cache:'no-store'}).then(r=>r.json());
 if(data.raster_paint?.version!==24)throw Error('v24 is not ready');
 const saved=sumukExport.settings;
 try{
 await sumukExport.configure({settings:{...saved,showBrush:false,revealOriginal:false,sound:false}});
 const real=a=>6+.8+(a-.8)*(saved.drawDuration-.8)/49;
 const person=data.raster_paint.head_first_people[0];
 const headTime=real(person.body_start)-.001;
 sumukExport.frame(headTime);
 window.qaHeadData=sumukExport.canvas.toDataURL();
 const activeLabel=document.querySelector('#strokeLabel').textContent;
 const currentPigment=document.querySelector('#pigmentLabel')?.textContent;
 const started=performance.now();
 sumukExport.frame(6+saved.drawDuration+.2);
 window.qaCompleteData=sumukExport.canvas.toDataURL();
 const renderMs=performance.now()-started;
 sumukExport.frame(headTime);
 const rewindExact=window.qaHeadData===sumukExport.canvas.toDataURL();
 if(!rewindExact)throw Error('Head-first rewind differs');
 const buttons=[...document.querySelectorAll('#chapters button')].map(b=>b.textContent);
 if(buttons.filter(b=>b.includes('머리·얼굴 채색')).length!==data.raster_paint.head_first_people.length)throw Error('Missing head review buttons');
 const result={version:24,strokes:data.strokes.length,people:data.raster_paint.head_first_people.length,
               head_preview_time:headTime,head_preview_label:activeLabel,current_pigment:currentPigment,
               rewind_exact:rewindExact,final_render_ms:renderMs,
               color_review_buttons:buttons.filter(b=>b.startsWith('배경 ·')).length,
               source_size:data.raster_paint.working_size};
 return result;
 }finally{
  // The review tab remains usable after visual QA, including its original audio.
  await sumukExport.configure({settings:saved});
 }
})()
