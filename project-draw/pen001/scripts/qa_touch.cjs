// CDP supplies real two-finger input, which the main agent-browser CLI QA cannot express.
const fs=require('node:fs'),path=require('node:path');
const puppeteer=require('/Users/jatu/.npm/_npx/0f94ee7615faf582/node_modules/puppeteer-core');
(async()=>{
 const P=path.resolve(__dirname,'../site'),errors=[];
 const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:5185/?lang=ko',{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.pen001?.ready);
  await page.evaluate(()=>document.querySelector('button[data-album="3"]').click());
  await page.waitForFunction(()=>document.querySelector('#viewerStage img')?.naturalWidth>4000);
  const r=await page.$eval('.zoom-surface',e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};});
  const cdp=await page.createCDPSession(),x=r.x+r.width/2,y=r.y+r.height/2;
  async function touch(type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:4,radiusY:4,force:1}))});await new Promise(r=>setTimeout(r,35));}
  await touch('touchStart',[[x-40,y,1],[x+40,y,2]]);
  await touch('touchMove',[[x-65,y,1],[x+65,y,2]]);
  await touch('touchMove',[[x-95,y,1],[x+95,y,2]]);
  await touch('touchEnd',[]);
  const scale=await page.$eval('#zoom',e=>Number(e.value));if(scale<1.8)throw Error('Pinch did not enlarge the photograph: '+scale);
  const before=await page.$eval('.zoom-surface',e=>e.scrollLeft);
  await touch('touchStart',[[x+50,y,3]]);await touch('touchMove',[[x-75,y,3]]);await touch('touchEnd',[]);
  const after=await page.$eval('.zoom-surface',e=>e.scrollLeft);if(after-before<50)throw Error('Finger drag did not pan the enlarged photograph');
  await page.screenshot({path:path.join(P,'qa/mobile-touch-zoom.png')});
  await page.evaluate(()=>{const z=document.querySelector('#zoom');z.value=1;z.dispatchEvent(new Event('input',{bubbles:true}));});
  await touch('touchStart',[[x+80,y,4]]);await touch('touchMove',[[x-80,y,4]]);await touch('touchEnd',[]);
  const source=await page.$eval('#viewerStage img',e=>e.src);if(!source.endsWith('album-4.jpg'))throw Error('Swipe did not turn the album page: '+source);
  if(errors.length)throw Error(errors.join('\n'));
  const result={ok:true,real_mobile_touch_input:true,pinch_scale:scale,drag_pan_pixels:after-before,swipe_next_album:4,page_errors:errors};
  fs.writeFileSync(path.join(P,'qa/touch-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
