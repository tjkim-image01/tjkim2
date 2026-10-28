"""서양식 인체 구조 데생 레시피와 플레이어 도구 준비기.

sumuk.py(2026-10-25) 및 그 live-brush.js/brush-motion.js의 접촉점 고정,
획 방향·속도·추정 필압, 결정적인 자세 계산을 참고했다. 수묵 재질/번짐,
화선지 섬유/모세관 확산, 캘리그래피 도입/타악음/소장 이미지 전환은 이식하지 않는다.

현재 교회 프로젝트: 1부 인간·1편, 아담 한 명·60초·플레이어만.
큰 원·타원 → 관절 구와 팔다리 둥근 덩어리 → 내부 횡단선 → 인체 윤곽.
원/타원은 구조용 선이다. 반복 원형 도장을 찍는 채색과 구별한다.
새 음성·음악·MP4를 만들지 않으며 준비된 원음을 그대로 사용한다.

python3 lib/com/jatu/draw/europ.py --describe
python3 lib/com/jatu/draw/europ.py --prepare --project /path/to/project
python3 lib/com/jatu/draw/europ.py --check --project /path/to/project
"""
from __future__ import annotations
import argparse,hashlib,json,math
from pathlib import Path

RECIPE={
 'revision':'europ-circular-construction-v1','canvas':[1080,1920],'duration':60,
 'scope':'one single-human sample; player only','construction':['large circles and ellipses','joint spheres and tapered rounded limbs','cross-contours and smaller volumes','selected human outline'],
 'tools':['graphite_pencil','charcoal','western_flat_brush'], 'active_tool':'graphite_pencil',
 'tool_renderer':'actual Three.js geometry; paper contact fixed at local origin',
 'motion':['path direction','actual eased path speed','estimated pressure','deterministic short orientation inertia'],
 'paper':'dry drawing paper','ink_bleed':False,'capillary_diffusion':False,'wet_ink_shader':False,
 'calligraphy_intro':False,'percussion':False,'photo_overlay':False,'color_pass':False,
 'round_stamp_coloring':False,'mp4_export':False,'ending_hold_seconds':10,
 'reference':'sumuk.py and its live-brush.js / brush-motion.js; mechanics adapted, ink traits excluded',
}

def ellipse(cx,cy,rx,ry,angle=0,*,start=0,end=360,steps=64):
    """One continuous oval guide, never a filled pigment stamp."""
    a=math.radians(angle);out=[]
    for i in range(steps+1):
        t=math.radians(start+(end-start)*i/steps);x=rx*math.cos(t);y=ry*math.sin(t)
        out.append([round(cx+x*math.cos(a)-y*math.sin(a),3),round(cy+x*math.sin(a)+y*math.cos(a),3)])
    return out

def bezier(a,b,c,d,steps=24):
    out=[]
    for i in range(steps+1):
        t=i/steps;out.append([round((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k],3) for k in (0,1)])
    return out

def rounded_limb(a,b,ra,rb,bulge=.15):
    """Two curved side contours around an axis; end joint ovals are separate guides."""
    dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy);nx,ny=-dy/length,dx/length;out=[]
    for sign in (1,-1):
        p=[a[0]+nx*ra*sign,a[1]+ny*ra*sign];q=[b[0]+nx*rb*sign,b[1]+ny*rb*sign]
        c=[p[0]+dx*.34+nx*ra*sign*bulge,p[1]+dy*.34+ny*ra*sign*bulge]
        d=[q[0]-dx*.28+nx*rb*sign*bulge,q[1]-dy*.28+ny*rb*sign*bulge]
        out.append(bezier(p,c,d,q))
    return out

def dry_contact(progress, pressure=.37, load=1.0):
    """Dry graphite/paint contact, shared by the baked stroke and live pose.

    progress is eased path distance, not elapsed time. Pressure is estimated,
    not a measurement of an artist's hand. No spreading outside contact.
    """
    q=max(0.,min(1.,progress))
    u=.5-math.sin(math.asin(1-2*q)/3)
    def ease(v):
        v=max(0.,min(1.,v));return v*v*(3-2*v)
    envelope=math.sqrt(ease(u/.12)*ease((1-u)/.18))
    contact=max(0.,min(1.,pressure))*envelope
    width=.30+.70*math.sqrt(contact/.68)
    density=max(0.,min(1.,load))*(.12+.88*envelope)*(.60+.40*min(1.,pressure/.62))
    return {'pressure':contact,'width_factor':width,'density_factor':density}

MOTION_JS=r'''// Adapted from sumuk brush-motion: path-based pose without ink simulation.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export function europDryContact(progress,pressure=.37,load=1){
 const q=clamp(progress),u=.5-Math.sin(Math.asin(1-2*q)/3),envelope=Math.sqrt(ease(u/.12)*ease((1-u)/.18)),contact=clamp(pressure)*envelope;
 return {pressure:contact,width_factor:.30+.70*Math.sqrt(contact/.68),density_factor:clamp(load)*(.12+.88*envelope)*(.60+.40*Math.min(1,pressure/.62))};
}
function pointAt(m,d){const c=m.lengths,p=m.points;d=clamp(d,0,c.at(-1));let k=0;while(k<c.length-2&&c[k+1]<d)k++;const u=clamp((d-c[k])/Math.max(.001,c[k+1]-c[k]));return [p[k][0]+(p[k+1][0]-p[k][0])*u,p[k][1]+(p[k+1][1]-p[k][1])*u];}
export function europPoseFromMotion({dx=0,dy=1,speed=0,pressure=0,penup=false}){
 const n=Math.hypot(dx,dy)||1;dx/=n;dy/=n;const rush=clamp(Math.log1p(Math.max(0,speed)/70)/Math.log1p(1800/70)),p=penup?0:clamp(pressure);
 return {pressure:p,speed:rush,rawSpeed:speed,direction:[dx,dy],pitch:clamp(1.05-.38*rush-.10*p,.42,1.10),roll:clamp(-.24+.68*dx*rush+.13*dy*rush,-.95,.70),yaw:.24*dx*rush,penup};
}
function motionAt(marks,t){
 let i=marks.findIndex(m=>m.end>t);if(i<0)i=marks.length-1;const m=marks[i],u=clamp((t-m.start)/Math.max(.001,m.end-m.start)),penup=t<m.start||t>=m.end;
 if(penup){const a=m.from_point||m.points[0],b=m.points[0],dt=Math.max(.001,m.start-m.travel_start);return europPoseFromMotion({dx:b[0]-a[0],dy:b[1]-a[1],speed:Math.hypot(b[0]-a[0],b[1]-a[1])/dt,penup:true});}
 const len=m.lengths.at(-1),d=len*ease(u),w=Math.max(1,Math.min(9,len*.08)),a=pointAt(m,d-w),b=pointAt(m,d+w),entry=ease(u/.12),release=ease((1-u)/.18),base=m.pressure??(m.kind==='form'?.63:m.kind==='hatch'?.37:.29);
 return europPoseFromMotion({dx:b[0]-a[0],dy:b[1]-a[1],speed:len/Math.max(.02,m.end-m.start)*6*u*(1-u),pressure:base*Math.sqrt(entry*release),penup:false});
}
export function europMotionAt(marks,t){
 const current=motionAt(marks,t),mark=marks.find(m=>m.end>t)||marks.at(-1),material=mark.pressure_deposition?{dryDeposit:true,materialLoad:mark.material_load??1}:{};let pitch=0,roll=0,yaw=0,total=0;for(let i=0;i<6;i++){const w=6-i,p=motionAt(marks,Math.max(0,t-i*.012));pitch+=p.pitch*w;roll+=p.roll*w;yaw+=p.yaw*w;total+=w;}return {...current,...material,pitch:pitch/total,roll:roll/total,yaw:yaw/total};
}
'''

TOOL_JS=r'''import * as THREE from '__THREE_IMPORT__';
// Sumuk LiveBrush's origin-contact/real-time-pose pattern, rebuilt as dry Western tools.
// No wet ink, paper fibre shader, capillary diffusion or calligraphy model.
export class EuropLiveTool{
 constructor(){
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(1);this.renderer.setSize(600,480);this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-150,150,160,-80,.1,1000);this.camera.position.set(0,0,500);this.camera.lookAt(0,0,0);this.anchor=[300,380];
  this.scene.add(new THREE.AmbientLight(0xffffff,2.0));const light=new THREE.DirectionalLight(0xfff4df,3);light.position.set(-130,220,300);this.scene.add(light);const rim=new THREE.DirectionalLight(0xffffff,1);rim.position.set(180,20,150);this.scene.add(rim);
  this.tools={};for(const kind of ['graphite_pencil','charcoal','western_flat_brush'])this.tools[kind]=this.create(kind);this.current=null;this.lastPose=null;
 }
 create(kind){
  const g=new THREE.Group(),wood=new THREE.MeshStandardMaterial({color:0xc39142,roughness:.72}),cut=new THREE.MeshStandardMaterial({color:0xd8b780,roughness:.92}),graphite=new THREE.MeshStandardMaterial({color:0x353331,roughness:.55}),metal=new THREE.MeshStandardMaterial({color:0xb8b7ad,metalness:.7,roughness:.27});
  const add=(geo,mat,y=0)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.y=y;g.add(mesh);return mesh;};const shaft=(top,bottom,h,y,mat,sides=12)=>add(new THREE.CylinderGeometry(top,bottom,h,sides),mat,y);let bristles=null;
  if(kind==='graphite_pencil'){
   shaft(1.5,0,7,3.5,graphite,6);shaft(5,1.5,19,16.5,cut,6);shaft(5,5,113,82.5,wood,6);shaft(5.15,5.15,8,143,metal,12);shaft(5,5,11,152.5,new THREE.MeshStandardMaterial({color:0x716e65,roughness:1}),12);
   const facet=add(new THREE.BoxGeometry(1,100,.5),cut,81);facet.position.z=4.35;
  }else if(kind==='charcoal'){
   shaft(4.2,0,9,4.5,graphite,6);shaft(4.5,4.2,92,55,graphite,5);
  }else{
   const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(-12,1,-12,8);shape.lineTo(-13,31);shape.lineTo(13,31);shape.lineTo(12,8);shape.quadraticCurveTo(12,1,0,0);
   bristles=add(new THREE.ExtrudeGeometry(shape,{depth:4,bevelEnabled:false}),new THREE.MeshStandardMaterial({color:0x827052,roughness:.95}));bristles.position.z=-2;
   add(new THREE.BoxGeometry(27,23,8),metal,42);shaft(3.5,7,100,103,new THREE.MeshStandardMaterial({color:0x596146,roughness:.55}));
  }
  g.visible=false;g.position.set(0,-30,0);this.scene.add(g);return {g,kind,bristles};
 }
 draw(ctx,x,y,pose,kind='graphite_pencil',projectionScale=1){
  const tool=this.tools[kind];if(this.current!==tool){if(this.current)this.current.g.visible=false;tool.g.visible=true;this.current=tool;}
  // Rigid pencil pivots at its actual graphite contact. Only a flat brush has bristle flex.
  tool.g.rotation.set(pose.pitch,pose.yaw,pose.roll);if(tool.bristles){tool.bristles.scale.set(1+.3*pose.pressure,1-.16*pose.pressure,1);if(pose.dryDeposit){const light=.25+.12*(1-(pose.materialLoad??1));tool.bristles.material.color.setRGB(light,light*.97,light*.91);}else tool.bristles.material.color.setHex(0x827052);}
  this.renderer.render(this.scene,this.camera);const s=.68*projectionScale;ctx.drawImage(this.renderer.domElement,x-this.anchor[0]*s,y-this.anchor[1]*s,600*s,480*s);this.lastPose={...pose,kind,contact:[x,y],projectionScale};
 }
 inspect(){const point=this.current?this.current.g.localToWorld(new THREE.Vector3()).project(this.camera):null;const projected=point?[(point.x+1)*300,(1-point.y)*240]:null;return {projectedAnchor:projected,anchor:this.anchor,renderer:'Three.js live 3D',activeTool:this.current?.kind,pose:this.lastPose,originContact:true,wetInk:false,capillaryDiffusion:false,sprite:false};}
 dispose(){this.renderer.dispose();}
}
'''

def prepare(project:Path,three_import='../../engine/vendor/three.module.js'):
    project=project.resolve();destination=project/'web/shorts-excerpts/construction';destination.mkdir(parents=True,exist_ok=True)
    payload={'europ-motion.js':MOTION_JS,'europ-tool.js':TOOL_JS.replace('__THREE_IMPORT__',three_import),'europ-recipe.json':json.dumps(RECIPE,ensure_ascii=False,indent=2)+'\n'}
    for name,text in payload.items():(destination/name).write_text(text)
    report={'recipe':RECIPE,'generator':str(Path(__file__).resolve()),'generator_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'files':{name:hashlib.sha256((destination/name).read_bytes()).hexdigest() for name in payload}}
    (destination/'europ-provenance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');return destination

def check(project:Path):
    destination=project.resolve()/'web/shorts-excerpts/construction';report=json.loads((destination/'europ-provenance.json').read_text())
    for name,sha in report['files'].items():
        if hashlib.sha256((destination/name).read_bytes()).hexdigest()!=sha:raise ValueError(f'Prepared runtime differs: {name}')
    if report['recipe']['mp4_export'] or report['recipe']['ink_bleed']:raise ValueError('Wrong recipe for dry player-only work')
    return report

def main():
    parser=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter);parser.add_argument('--describe',action='store_true');parser.add_argument('--prepare',action='store_true');parser.add_argument('--check',action='store_true');parser.add_argument('--project',type=Path);parser.add_argument('--three-import',default='../../engine/vendor/three.module.js');args=parser.parse_args()
    if args.describe:print(json.dumps(RECIPE,ensure_ascii=False,indent=2));return
    if not args.project:parser.error('--project is required for --prepare/--check')
    if args.prepare:print(prepare(args.project,args.three_import));return
    if args.check:check(args.project);print('EUROP_RUNTIME_VERIFIED');return
    parser.error('Choose --describe, --prepare or --check. This tool does not export MP4.')
if __name__=='__main__':main()
