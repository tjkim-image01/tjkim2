"""Review SVG scene stages in an isolated agent-browser session without saving options."""
import base64, json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw

P = Path(__file__).resolve().parents[1]
Q = P/'production/qa-vector-v17'
Q.mkdir(exist_ok=True)
SESSION = 'sumuk-vector-series-v17'

def ab(*args):
    r = subprocess.run(['agent-browser','--session',SESSION,'--json',*map(str,args)],capture_output=True,text=True,check=True)
    result = json.loads(r.stdout)
    assert result['success'], result
    return result.get('data',{})

def ev(js): return ab('eval',js).get('result')

results = []
for n in range(3,12):
    ep = f'ep{n:02d}'
    E = P/'episodes'/ep
    current = json.loads((E/'art/painting.json').read_text())
    previous = json.loads((E/'versions/before-vector-v17/painting.json').read_text())
    assert current['strokes'] == previous['strokes'], (ep,'source timing/order modified')
    assert json.loads((E/'art/painting-vector.json').read_text())['version'] == 17
    ab('open',f'http://127.0.0.1:5184/series/site/studio.html?ep={ep}&export=1')
    ab('wait','--fn','window.sumukExport?.ready===true')
    item = {'episode':ep,'source_order_and_timing_preserved':True,'screenshots':[]}
    for t in [16,45,57,63.5]:
        uri = ev(f'(sumukExport.frame({t}),sumukExport.canvas.toDataURL("image/png"))')
        name = f'{ep}-{t:g}.png'
        (Q/name).write_bytes(base64.b64decode(uri.split(',')[1]))
        item['screenshots'].append(name)
    ev('sumukExport.configure({settings:{...sumukExport.settings,showBrush:false}})')
    item['artwork_rewind_exact'] = ev('(sumukExport.frame(16),window.qaFirst=sumukExport.canvas.toDataURL(),sumukExport.frame(38),sumukExport.frame(16),qaFirst===sumukExport.canvas.toDataURL())')
    assert item['artwork_rewind_exact'], ep
    item['failed_resources'] = ev('performance.getEntriesByType("resource").filter(e=>e.responseStatus>=400).map(e=>({url:e.name,status:e.responseStatus}))')
    assert not item['failed_resources'], item
    results.append(item)
    sheet = Image.new('RGB',(864,430),'#e6e1d3')
    draw = ImageDraw.Draw(sheet)
    for col,name in enumerate(item['screenshots']):
        im = Image.open(Q/name).convert('RGB');im.thumbnail((216,384))
        sheet.paste(im,(col*216,24))
        draw.text((col*216+6,5),name,fill='#222222')
    sheet.save(Q/f'{ep}-stages.jpg',quality=94)
    print('SVG_SCENE_QA',ep,flush=True)
(Q/'report.json').write_text(json.dumps({'ok':True,'episodes':results},ensure_ascii=False,indent=2)+'\n')
ab('close')
