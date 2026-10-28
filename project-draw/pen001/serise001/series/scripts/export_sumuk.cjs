/** Exact player export: fixed simulation timestamps → WebCodecs AVC → FFmpeg mux. */
const fs=require('node:fs'),path=require('node:path');
const pp=require(process.env.PUPPETEER_MODULE||'/Users/jatu/.npm/_npx/0f94ee7615faf582/node_modules/puppeteer-core');
(async()=>{
 const [settingsFile,localeFile,outFile,mode='video']=process.argv.slice(2);
 if(!settingsFile||!outFile)throw Error('Usage: node export_sumuk.cjs settings.json locale.json|- output.h264 [probe|video|audio]');
 const settings=JSON.parse(fs.readFileSync(settingsFile)),locale=localeFile==='-'?null:JSON.parse(fs.readFileSync(localeFile));
 const episode=process.env.SUMUK_EPISODE||locale?.episode||path.resolve(settingsFile).match(/episodes\/(ep\d+)\//)?.[1]||'ep02';
 const browser=await pp.launch({executablePath:process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-webgl','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 try{
 const page=await browser.newPage();page.on('pageerror',e=>console.error('PAGE',e.message));await page.setViewport({width:1440,height:1000});
 await page.goto((process.env.SUMUK_PLAYER_URL||`http://127.0.0.1:5184/series/site/studio.html?ep=${episode}`)+'&export=1',{waitUntil:'networkidle0',timeout:120000});
 await page.waitForFunction(()=>window.sumukExport?.ready,{timeout:120000});
 const spec=await page.evaluate(async payload=>await window.sumukExport.configure(payload),{settings,locale});console.log('READY',JSON.stringify(spec));
 const cfg={codec:'avc1.64002a',width:1080,height:1920,bitrate:10000000,framerate:30,latencyMode:'realtime',avc:{format:'annexb'}};
 const support=await page.evaluate(async cfg=>({videoEncoder:typeof VideoEncoder,supported:(await VideoEncoder.isConfigSupported(cfg)).supported}),cfg);console.log('CODEC',JSON.stringify(support));
 if(mode==='probe'){for(const t of [0,1.6,4.8,13,33,62]){await page.evaluate(t=>sumukExport.frame(t),t);const b=await page.$eval('#painting',c=>c.toDataURL('image/png'));fs.writeFileSync(outFile+'.'+t+'.png',Buffer.from(b.split(',')[1],'base64'));}return;}
 if(mode==='audio'||mode==='both'){
 const b64=await page.evaluate(async({settings,locale,duration,episode})=>{
 const sr=48000,ac=new OfflineAudioContext(2,Math.ceil(duration*sr),sr),base=`../episodes/${episode}/`;
 async function buffer(url){const r=await fetch(url);if(!r.ok)throw Error(url);return ac.decodeAudioData(await r.arrayBuffer());}
 const fx=ac.createDynamicsCompressor();Object.assign(fx.threshold,{value:-5});fx.knee.value=5;fx.ratio.value=12;fx.attack.value=.003;fx.release.value=.15;
 const quarter=ac.createGain();quarter.gain.value=.25;const shaper=ac.createWaveShaper(),curve=new Float32Array(8193);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1,y=x*4;curve[i]=y/Math.pow(1+Math.pow(y,4),.25);}shaper.curve=curve;shaper.oversample='4x';fx.connect(quarter).connect(shaper).connect(ac.destination);
 async function source(url,at,offset,gain,end,effect=false,fade=false){const b=await buffer(url),s=ac.createBufferSource(),g=ac.createGain();s.buffer=b;g.gain.value=gain;s.connect(g).connect(effect?fx:ac.destination);if(fade){g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(gain,at+.28);g.gain.setValueAtTime(gain,duration-1.8);g.gain.linearRampToValueAtTime(0,duration);}s.start(at,offset,Math.min(end-at,b.duration-offset));}
 if(settings.sound){await source(base+(locale?.voice||'audio/voice-director.m4a'),0,0,settings.volume,duration);
 if(settings.musicEnabled){const lib=await fetch('/api/series-music').then(r=>r.json());const list=Array.isArray(lib)?lib:(lib.tracks||[]),track=list.find(x=>x.id===settings.musicTrack);if(!track)throw Error('Music track not found');await source(track.url,settings.musicStart,settings.musicOffset,settings.volume*settings.musicVolume*.55,duration,false,true);}
 if(settings.effectsEnabled){await source(base+'audio/roll-v7.m4a',0,0,settings.volume*settings.rollVolume,3.5,true);await source(base+'audio/court-finish-v9.m4a',3.5,0,settings.volume*settings.finishVolume,5.05,true);}}
 const rendered=await ac.startRendering(),n=rendered.length,ch=2,buf=new ArrayBuffer(44+n*ch*2),v=new DataView(buf);function str(at,s){for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));}str(0,'RIFF');v.setUint32(4,36+n*ch*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*ch*2,true);let peak=0;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const x=rendered.getChannelData(c)[i];peak=Math.max(peak,Math.abs(x));v.setInt16(44+(i*ch+c)*2,Math.max(-32768,Math.min(32767,Math.round(x*32767))),true);}const u=new Uint8Array(buf);let binary='';for(let j=0;j<u.length;j+=32768)binary+=String.fromCharCode(...u.subarray(j,j+32768));return {b64:btoa(binary),peak};
 },{settings,locale,duration:spec.duration,episode});fs.writeFileSync(mode==='both'?outFile.replace(/\.h264$/,'-mix.wav'):outFile,Buffer.from(b64.b64,'base64'));console.log('AUDIO_PEAK',b64.peak);if(mode==='audio')return;
 }
 if(!support.supported)throw Error('AVC WebCodecs unsupported');fs.writeFileSync(outFile,'');await page.exposeFunction('saveEncoded',b64=>{fs.appendFileSync(outFile,Buffer.from(b64,'base64'));});await page.exposeFunction('exportProgress',s=>console.log(s));
 const report=await page.evaluate(async({cfg,duration})=>{
 let count=0,pending=Promise.resolve(),error=null;const encoder=new VideoEncoder({output(chunk){const u=new Uint8Array(chunk.byteLength);chunk.copyTo(u);let s='';for(let j=0;j<u.length;j+=32768)s+=String.fromCharCode(...u.subarray(j,j+32768));const b64=btoa(s);pending=pending.then(()=>window.saveEncoded(b64));count++;},error(e){error=e.message;}});encoder.configure(cfg);
 const n=Math.round(duration*cfg.framerate),start=performance.now();for(let i=0;i<n;i++){sumukExport.frame(i/cfg.framerate);const f=new VideoFrame(sumukExport.canvas,{timestamp:Math.round(i*1e6/cfg.framerate),duration:Math.round(1e6/cfg.framerate)});encoder.encode(f,{keyFrame:i%60===0});f.close();if(encoder.encodeQueueSize>4)await encoder.flush();if(i%150===0){await window.exportProgress(`${i}/${n}`);await new Promise(r=>setTimeout(r,0));}if(error)throw Error(error);}
 await encoder.flush();await pending;encoder.close();return {frames:count,seconds:duration,elapsed:(performance.now()-start)/1000};
 },{cfg,duration:spec.duration});fs.writeFileSync(outFile+'.json',JSON.stringify({...report,settings,locale:locale?.language||'ko'},null,2));console.log('DONE',JSON.stringify(report));
 }finally{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]);browser.disconnect();const processHandle=browser.process();if(processHandle?.exitCode===null)processHandle.kill('SIGKILL');}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
