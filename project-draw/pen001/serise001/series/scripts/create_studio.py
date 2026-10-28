from pathlib import Path
p=Path('site/studio.css');s=p.read_text().replace("url('fonts/","url('../../web/fonts/");p.write_text(s)
p=Path('site/studio.html');s=p.read_text().replace('href="video.html"','href="watch.html" id="finishLink"').replace('href="../output/serise001-ep01-short-60s-v3.mp4"','href="watch.html" id="mp4Link"').replace('첫 번째 그림 · 마지막 길을 함께','<span id="episodeName">풍속화 속 한국</span>').replace('풍속화 드로잉 작업실</a>','TJ KIM 컬렉션</a>').replace('src="../art/base.png"','id="referenceImage"').replace('src="../audio/voice-60s-v3.m4a"','').replace('src="../audio/music-bed-v3.m4a"','').replace('href="../research/music-license.md"','href="../../research/music-license.md"');p.write_text(s)
p=Path('site/studio.js');s=p.read_text();prefix="""const requestedEpisode=new URLSearchParams(location.search).get('ep')||'ep02';
const EPID=/^ep(0[2-9]|1[01])$/.test(requestedEpisode)?requestedEpisode:'ep02',EPBASE='../episodes/'+EPID;
const INFO=await fetch(EPBASE+'/episode.json').then(r=>r.json());
document.getElementById('episodeName').textContent=INFO.title;
document.getElementById('finishLink').href='watch.html?ep='+EPID;
document.getElementById('mp4Link').href=EPBASE+'/output/'+EPID+'-short-60s.mp4';
document.getElementById('referenceImage').src=EPBASE+'/art/original-clean.png';
document.getElementById('audio').src=EPBASE+'/audio/voice.m4a';
document.getElementById('musicAudio').src=EPBASE+'/audio/music.m4a';
const SETTINGS_URL='/api/series-settings?episode='+EPID;
""";s=prefix+s
s=s.replace("hook:'K팝보다 먼저,\\n조선을 알린 그림',title:'마지막 길을 함께',byline:'운초 전칭 · 장례 행렬'", "hook:INFO.hook+'\\n'+INFO.title,title:INFO.title,byline:'운초 전칭 · TJ KIM 컬렉션'")
s=s.replace('const PS=2','const PS=1').replace("'pen001-studio-draft'","'pen001-studio-'+EPID+'-draft'").replace("fetch('/api/settings'","fetch(SETTINGS_URL")
s=s.replace("fetch('../art/assets-v2/painting.json')","fetch(EPBASE+'/art/painting.json')").replace("fetch('../audio/captions-v3.json')","fetch(EPBASE+'/audio/captions.json')").replace("image('../art/assets-v2/'+m.file)","image(EPBASE+'/art/'+m.file)").replace("../art/brush/", "../../art/brush/")
s=s.replace("const names={sketch:'구도선',bier:'상여',rear:'뒤쪽 사람들',right:'오른쪽 인물',left:'왼쪽 인물·여인',front:'앞쪽 사람들',finish:'마지막 붓질'};", "const names={sketch:'구도선',background:'풍경',left:'왼쪽 인물',center:'손과 도구',right:'오른쪽 인물',detail:'세부 묘사'};")
s=s.replace("const labels={sketch:'종이 위에 구도를 잡다',bier:'상여와 멜대',rear:'행렬에 사람이 더해지다',right:'도포의 바탕에서 얼굴까지',left:'옷차림에 남은 시대',front:'함께 걷는 사람들',finish:'마지막 붓질'};", "const labels={sketch:'종이 위에 구도를 잡다',background:'풍경의 큰 색을 놓다',left:'사람의 옷차림과 몸짓',center:'장면을 설명하는 손과 도구',right:'인물의 표정과 옷 주름',detail:'작은 흔적을 더하다'};")
a=s.index('const full=');b=s.index('\nfunction place(',a);s=s[:a]+"""const full=[0,0,1000,652],left=[50,100,610,650],front=[390,80,990,652];
function views(at){if(settings.camera!=='auto')return [{box:({full,left,front})[settings.camera],alpha:1}];const z=1+.08*ease((at-22)/.8)*(1-ease((at-47.8)/2)),l=(1000-1000/z)/2,t=(652-652/z)/2;return [{box:[l,t,1000-l,652-t],alpha:1}];}"""+s[b:]
s=s.replace("text('풍속화 속 한국  /  01',", "text('풍속화 속 한국  /  '+String(INFO.number).padStart(2,'0'),")
a=s.index("async()=>{outroSpec=await fetch(");b=s.index('];const assetResults=',a);s=s[:a]+"""async()=>{const asset=await image(EPBASE+'/art/original-layout.png');originalCanvas=document.createElement('canvas');originalCanvas.width=source.width;originalCanvas.height=source.height;const oc=originalCanvas.getContext('2d');oc.fillStyle='#f8f5ea';oc.fillRect(0,0,originalCanvas.width,originalCanvas.height);oc.drawImage(asset,0,0,originalCanvas.width,originalCanvas.height);}"""+s[b:]
s=s.replace("const m=marks.find(m=>m.element===group),b=document.createElement('button');", "const m=marks.find(m=>m.element===group);if(!m)continue;const b=document.createElement('button');")
p.write_text(s)
