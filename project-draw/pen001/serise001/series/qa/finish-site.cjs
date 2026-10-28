const puppeteer = require('/Users/jatu/.npm/_npx/0f94ee7615faf582/node_modules/puppeteer-core');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const base='http://127.0.0.1:5184/series/site/';
const hash=f=>fs.existsSync(f)?crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'):null;
(async()=>{
 const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const setting='episodes/ep02/config/player-settings.json',old=fs.existsSync(setting)?fs.readFileSync(setting):null;
 const ep01=hash('../config/player-settings.json'),ep03=hash('episodes/ep03/config/player-settings.json');const report={};
 try{
  await page.emulate(puppeteer.KnownDevices['iPhone 13']);
  await page.goto(base,{waitUntil:'networkidle0'});await page.waitForSelector('.story-card');
  report.mobile=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,cards:document.querySelectorAll('.story-card').length}));
  if(report.mobile.width>report.mobile.viewport||report.mobile.cards!==10)throw Error('Mobile home layout failed');
  await page.evaluate(async()=>{for(const im of document.images)im.loading='eager';await Promise.all([...document.images].map(im=>im.decode().catch(()=>{})))});
  report.mobileCard=await page.$eval('.story-card img',im=>({width:im.clientWidth,height:im.clientHeight}));if(Math.abs(report.mobileCard.width/report.mobileCard.height-1.5)>.05)throw Error('Card image ratio failed');
  await page.screenshot({path:'qa/mobile-home.png',fullPage:true});await page.screenshot({path:'qa/mobile-first-screen.png'});
  await page.goto(base+'watch.html?ep=ep02',{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>document.querySelector('#video').readyState>=1);
  report.mobileWatch=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,playlist:document.querySelectorAll('#playlist button').length}));
  if(report.mobileWatch.width>report.mobileWatch.viewport||report.mobileWatch.playlist!==10)throw Error('Mobile player layout failed');
  await page.screenshot({path:'qa/mobile-watch.png',fullPage:true});
  await page.evaluate(async()=>{const v=document.querySelector('#video');v.muted=true;v.currentTime=59.6;await v.play()});
  await page.waitForFunction(()=>document.querySelector('#title').textContent==='옷을 두드리던 시간',{timeout:12000});
  report.automaticNext=true;await page.evaluate(()=>document.querySelector('#video').pause());
  await page.goto(base+'studio.html?ep=ep02',{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>document.querySelector('#loading').hidden,{timeout:45000});
  report.mobileStudio=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
  if(report.mobileStudio.width>report.mobileStudio.viewport)throw Error('Mobile studio overflow');
  await page.screenshot({path:'qa/mobile-studio.png',fullPage:true});
  await page.select('#camera','front');await page.$eval('#camera',el=>el.dispatchEvent(new Event('input',{bubbles:true})));
  await page.$eval('#drawDuration',el=>{el.value=51;el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.click('#save');await page.waitForFunction(()=>document.querySelector('#saveState').textContent==='저장됨');
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>document.querySelector('#loading').hidden);
  report.saved=await page.evaluate(()=>({duration:document.querySelector('#drawDuration').value,camera:document.querySelector('#camera').value}));
  if(report.saved.duration!=='51'||report.saved.camera!=='front')throw Error('Setting persistence failed');
  report.ep01Unchanged=ep01===hash('../config/player-settings.json');report.ep03Unchanged=ep03===hash('episodes/ep03/config/player-settings.json');
  if(!report.ep01Unchanged||!report.ep03Unchanged)throw Error('Setting isolation failed');
  report.errors=errors;if(errors.length)throw Error(errors.join('\n'));report.allPass=true;
 }finally{
  if(old){fs.mkdirSync(path.dirname(setting),{recursive:true});fs.writeFileSync(setting,old)}else if(fs.existsSync(setting))fs.unlinkSync(setting);
  await browser.close();fs.writeFileSync('qa/site-final.json',JSON.stringify(report,null,2));
 }
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
