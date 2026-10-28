"""Catalogue the actual mounted cards visible in the collection photographs. No image edits."""
from pathlib import Path
import json
from PIL import Image
P=Path(__file__).resolve().parents[1];SITE=P/'site';SERIES=P/'serise001/series'
# Bounds are in the previously inspected 1400px-wide photo coordinate system.
rows=[
 ('yut',2,'left',[142,88,613,421],'play','ep02',['윷놀이','Yutnori','ユンノリ']),
 ('procession',2,'right',[826,88,1273,433],'life',None,['운구 행렬','A funeral procession','葬送の行列']),
 ('cloth',3,'left',[126,84,615,438],'life','ep03',['다듬이질','Beating cloth','布を打つ仕事']),
 ('food',3,'right',[821,80,1295,440],'work','ep04',['음식 가게','A roadside food stall','道沿いの食べ物屋']),
 ('people',4,'left',[195,72,660,440],'life',None,['길 위의 사람들','People on the road','道を行く人々']),
 ('rain',4,'right',[811,87,1297,445],'life','ep05',['비 오는 날','A rainy day','雨の日']),
 ('music',5,'left',[160,85,640,425],'play','ep06',['줄악기와 장단','Strings and rhythm','弦の音と拍子']),
 ('table',5,'right',[817,84,1286,430],'life','ep07',['낮은 상의 식사','A meal at a low table','低い膳の食事']),
 ('janggi',6,'left',[113,76,612,438],'play','ep08',['장기 두는 사람들','Playing janggi','チャンギを指す人々']),
 ('rice',6,'right',[808,86,1298,440],'work','ep09',['떡메치기','Pounding rice cakes','餅つき']),
 ('sweets',7,'left',[117,82,613,440],'work','ep10',['엿장수','A sweet vendor','飴売り']),
 ('washing',7,'right',[801,81,1297,440],'life','ep11',['물가의 빨래','Washing by the water','水辺の洗濯']),
 ('carrying',8,'left',[120,98,573,407],'work',None,['짐을 나르는 길','Carrying goods','荷を運ぶ道']),
 ('porter',8,'right',[746,38,1055,485],'work',None,['지게꾼','A porter','背負子を担ぐ人']),
 ('performance',8,'right',[1056,37,1358,497],'play',None,['춤과 연희','Dance and performance','踊りと芸能']),
 ('dress',9,'left',[201,15,509,480],'life',None,['인물과 옷차림','People and dress','人物と装い']),
 ('ox',9,'right',[892,30,1328,514],'work',None,['짐을 나르는 사람과 소','People, loads and an ox','荷を運ぶ人と牛']),
]
notes={
 'procession':['여러 사람이 긴 짐을 함께 메고 이동하는 장면입니다. 짚으로 덮인 형태와 멜대, 함께 걷는 사람들의 차림을 살펴보세요.','Several people carry a long, covered load together. Look at the straw covering, carrying poles and the clothing of those walking alongside.','長く覆われた荷を複数の人が運ぶ場面です。藁の覆い、担ぎ棒、共に歩く人々の装いを見てみましょう。'],
 'people':['여러 사람이 한 방향으로 걸어가고 있습니다. 서로 다른 옷차림과 손에 든 물건이 작은 화면 안에 모여 있습니다.','A group walks in the same direction. Different clothes and objects carried in their hands share the small picture.','複数の人が同じ方向へ歩いています。異なる装いと手にした物が小さな画面に集まっています。'],
 'carrying':['사람과 말이 짐을 나르며 길을 이동합니다. 등에 멘 짐과 동물에 실은 짐을 함께 볼 수 있습니다.','People and horses carry goods along a path. Compare the loads carried on a back with those placed on the animals.','人と馬が荷を運びながら道を進みます。背負った荷と動物に載せた荷を見比べられます。'],
 'porter':['지게를 진 인물과 짐을 나르는 모습이 위아래로 그려져 있습니다. 화면 바깥에 남은 글씨와 인장도 실물 사진에서 확인할 수 있습니다.','A porter and scenes of carrying loads occupy the card. The photograph also preserves writing and seals around the figures.','背負子を担ぐ人物と荷運びの様子が描かれています。人物の周囲に残る文字や印も写真で確認できます。'],
 'performance':['위아래에 서로 다른 몸짓의 인물이 배치돼 있습니다. 긴 소매와 손에 든 물건, 인물의 자세를 살펴보세요.','Figures in different poses are arranged above and below one another. Notice the long sleeves, objects in their hands and changing gestures.','上下に異なる身振りの人物が配されています。長い袖、手にした物、体の姿勢に注目してみましょう。'],
 'dress':['세 인물과 꽃병, 작은 탁자가 함께 그려져 있습니다. 옷의 색과 서로를 향한 몸짓을 가까이 볼 수 있습니다.','Three figures appear beside a vase and a small table. The photograph reveals the colors of their dress and gestures toward one another.','三人の人物と花瓶、小さな卓が描かれています。衣服の色や互いに向けた身振りを間近で見られます。'],
 'ox':['위에는 짐을 어깨에 멘 사람들, 아래에는 소와 농기구를 다루는 인물이 보입니다. 한 장에 두 장면이 함께 배치돼 있습니다.','The upper scene shows people carrying a load on their shoulders. Below, a figure stands with an ox and farming equipment. Two scenes share one card.','上には肩で荷を運ぶ人々、下には牛と農具を扱う人物が見えます。一枚に二つの場面が配されています。']}
manifest=json.loads((SERIES/'manifest.json').read_text());episodes={e['id']:e for e in manifest}
photos=[]
for n in range(1,11):
 path=SITE/f'assets/photos/album-{n}.jpg';im=Image.open(path)
 photos.append({'id':n,'url':'/assets/photos/'+path.name,'preview':f'/research/album-{n}.jpg','width':im.width,'height':im.height,'kind':'front' if n==1 else 'back' if n==10 else 'spread'})
works=[]
for id,album,side,bounds,category,episode,titles in rows:
 photo=photos[album-1];scale=photo['width']/1400;l,t,r,b=[round(x*scale) for x in bounds]
 work={'id':id,'album':album,'side':side,'crop':[l,t,r-l,b-t],'category':category,'episode':episode,'titles':dict(zip(['ko','en','ja'],titles)),'descriptions':{},'editions':{}}
 for i,lang in enumerate(['ko','en','ja']):
  if episode:
   e=episodes[episode];v=e['editions'][lang]
   work['descriptions'][lang]=v['narration'][0] if v['narration'] else ''
   work['editions'][lang]={**v,'video':'/series/'+v['video'].removeprefix('../'),'poster':'/series/'+v['poster'].removeprefix('../')}
  else:work['descriptions'][lang]=notes[id][i]
 if episode:work['sources']=episodes[episode]['sources']
 else:work['sources']=[]
 works.append(work)
data={'collection':'APKC260507306','artist':{'ko':'운초 전칭','en':'Attributed to Uncho','ja':'伝・ウンチョ作'},'photos':photos,'works':works,'bundles':{}}
for lang,b in json.loads((SERIES/'output/bundles.json').read_text()).items():data['bundles'][lang]={**b,'url':'/series/'+b['url'].removeprefix('../')}
(SITE/'data/collection.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print('CATALOGUED',len(photos),'original photos,',len(works),'mounted cards,',sum(bool(w['episode']) for w in works),'video scenes')
