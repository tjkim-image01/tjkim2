const duration=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
export class MusicLibrary{
 constructor(panel,filmAudio,callbacks){
  this.film=filmAudio;this.callbacks=callbacks;this.tracks=[];this.track=null;this.selectedOffset=0;
  const box=document.createElement('div');box.className='music-library';box.innerHTML=`<label>영상에 사용할 음악<select id="musicTrack"></select></label><p id="musicMood" class="help"></p>
  <audio id="musicPreview" controls preload="metadata" aria-label="선택한 음악 전체 듣기"></audio>
  <canvas id="musicWave" width="620" height="94" aria-label="클릭하여 음원 시작 위치 선택" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"></canvas>
  <p id="musicPoint" class="help"></p><div class="music-buttons"><button id="musicListenAll">처음부터 전체 듣기</button><button id="musicListenPoint">지정 위치부터 듣기</button><button id="musicUsePoint">듣는 위치를 영상에 사용</button></div>
  <label class="file-button music-upload">내 음악 파일로 교체<input id="musicUpload" type="file" accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg,.aac"></label>
  <p class="help" id="musicLibraryStatus" role="status">음악 목록 불러오는 중</p><p class="help" id="musicPlaybackStatus" role="status"></p>`;
  panel.querySelector('summary').after(box);this.box=box;this.select=box.querySelector('#musicTrack');this.preview=box.querySelector('#musicPreview');this.wave=box.querySelector('#musicWave');this.status=box.querySelector('#musicPlaybackStatus');
  this.select.onchange=()=>this.choose(this.select.value,true);
  this.preview.onplay=()=>callbacks.pauseFilm();this.preview.ontimeupdate=()=>this.paint();
  box.querySelector('#musicListenAll').onclick=()=>this.listen(0);box.querySelector('#musicListenPoint').onclick=()=>this.listen(this.selectedOffset);
  box.querySelector('#musicUsePoint').onclick=()=>callbacks.setOffset(Math.round(this.preview.currentTime*10)/10);
  this.wave.onclick=e=>{if(!this.track)return;const u=(e.clientX-this.wave.getBoundingClientRect().left)/this.wave.getBoundingClientRect().width;callbacks.setOffset(Math.max(0,Math.min(this.track.duration-.1,Math.round(u*this.track.duration*10)/10)))};
  this.wave.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();callbacks.setOffset(Math.max(0,Math.min((this.track?.duration||1)-.1,this.selectedOffset+(e.key==='ArrowRight'?1:-1))))}};
  box.querySelector('#musicUpload').onchange=e=>this.upload(e.target);
  for(const name of ['loadstart','waiting','stalled','canplay','playing','pause','error'])filmAudio.addEventListener(name,()=>this.updateStatus());
 }
 async refresh(){const r=await fetch('/api/series-music',{cache:'no-store'});if(!r.ok)throw Error('음악 목록을 읽지 못했습니다.');const {tracks}=await r.json();const signature=JSON.stringify(tracks.map(t=>[t.id,t.url,t.title,t.duration]));this.tracks=tracks;if(signature===this.catalogueSignature)return;this.catalogueSignature=signature;const previous=this.select.value;this.select.replaceChildren();for(const t of tracks){const o=document.createElement('option');o.value=t.id;o.textContent=`${t.title} · ${duration(t.duration)}`;this.select.append(o)}if(tracks.some(t=>t.id===previous))this.select.value=previous;this.box.querySelector('#musicLibraryStatus').textContent=`${tracks.length}곡 · 새 곡이 추가되면 이 목록에 자동으로 나타납니다.`;}
 async init(id,offset){await this.refresh();await this.choose(this.tracks.some(t=>t.id===id)?id:this.tracks[0]?.id,false);this.setOffset(offset,false);this.poll=setInterval(()=>this.refresh().catch(()=>{}),5000)}
 async choose(id,user){const track=this.tracks.find(t=>t.id===id);if(!track)return;const changed=this.track?.id!==id;this.track=track;this.select.value=id;this.box.querySelector('#musicMood').textContent=track.mood;
  if(changed){this.callbacks.pauseFilm();this.preview.pause();this.preview.src=track.url;this.film.src=track.url;this.film.load();}
  if(user)this.callbacks.selected(track);this.paint();this.updateStatus();
 }
 setOffset(value,seekPreview=true){this.selectedOffset=Math.min(Math.max(0,value),(this.track?.duration||1800)-.1);if(seekPreview&&this.preview.readyState>=1)this.preview.currentTime=this.selectedOffset;this.paint()}
 async listen(at){this.callbacks.pauseFilm();this.preview.volume=.85;if(this.preview.readyState<1)await new Promise((resolve,reject)=>{this.preview.addEventListener('loadedmetadata',resolve,{once:true});this.preview.addEventListener('error',()=>reject(Error('음악 파일을 읽지 못했습니다.')),{once:true})});this.preview.currentTime=Math.max(0,Math.min(at,this.preview.duration-.1));try{await this.preview.play()}catch(e){this.status.textContent=e.message}}
 stopPreview(){this.preview.pause()}
 async upload(input){const file=input.files[0];if(!file)return;const status=this.box.querySelector('#musicLibraryStatus');input.disabled=true;status.textContent='음악 파일을 저장하고 음량을 맞추는 중입니다…';try{const r=await fetch('/api/series-music?filename='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});const track=await r.json();if(!r.ok)throw Error(track.error);await this.refresh();await this.choose(track.id,true);status.textContent='내 음악으로 교체했습니다. 설정 저장을 누르면 다음에도 유지됩니다.'}catch(e){status.textContent='추가하지 못했습니다: '+e.message}finally{input.disabled=false;input.value=''}}
 updateStatus(){if(!this.track)return;const a=this.film;if(a.error){this.status.textContent='음악 파일을 읽지 못했습니다. 다른 곡을 선택해 주세요.';return}const s=this.callbacks.state();if(!s.enabled){this.status.textContent='배경음악 꺼짐';return}if(s.filmTime<s.start){this.status.textContent=`음악 대기 · 영상 ${s.start.toFixed(1)}초에 음원 ${s.offset.toFixed(1)}초부터 시작`;return}if(a.readyState<3||a.seeking){this.status.textContent='음악 불러오는 중…';return}this.status.textContent=`${a.paused?'음악 준비됨':'음악 재생 중'} · 음원 ${duration(a.currentTime)} / ${duration(this.track.duration)}`}
 paint(){const c=this.wave,x=c.getContext('2d'),w=c.width,h=c.height;x.fillStyle='#1d241e';x.fillRect(0,0,w,h);if(!this.track)return;const peaks=this.track.waveform||[],offset=this.selectedOffset/this.track.duration*w,now=this.preview.currentTime/this.track.duration*w;
 for(let i=0;i<peaks.length;i++){x.fillStyle=i/peaks.length*w<offset?'#776e5c':'#baa581';const height=Math.max(2,peaks[i]*(h-16));x.fillRect(i/peaks.length*w,(h-height)/2,Math.max(1,w/peaks.length*.7),height)}
 x.fillStyle='#f0cd96';x.fillRect(offset-1,0,2,h);if(!this.preview.paused){x.fillStyle='#d1e7ca';x.fillRect(now-1,0,2,h)}
 this.wave.setAttribute('aria-valuemax',this.track.duration);this.wave.setAttribute('aria-valuenow',this.selectedOffset);this.box.querySelector('#musicPoint').textContent=`영상에 쓸 음원 위치 ${this.selectedOffset.toFixed(1)}초 / 전체 ${duration(this.track.duration)} · 파형을 누르면 시작 위치가 바뀝니다.`;
 }
}
