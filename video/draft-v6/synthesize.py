from pathlib import Path
import asyncio,json,sys
R=Path(__file__).resolve().parent;sys.path.insert(0,str(R.parent/'.tools/python'))
import edge_tts
P=json.loads((R/'project.json').read_text(encoding='utf-8'))
async def make(s):
 stem=R/'audio'/f"scene-{s['id']:02d}";words=[]
 if stem.with_suffix('.mp3').exists() and stem.with_suffix('.words.json').exists():
  import unicodedata
  norm=lambda v:''.join(c.lower() for c in unicodedata.normalize('NFKC',v) if c.isalnum())
  prior=json.loads(stem.with_suffix('.words.json').read_text(encoding='utf-8'))
  if norm(''.join(w['text'] for w in prior))==norm(s['en']):return
 for attempt in range(3):
  try:
   c=edge_tts.Communicate(s['en'],P['voice'],rate=s['rate'],boundary='WordBoundary',receive_timeout=45)
   words=[]
   with stem.with_suffix('.mp3').open('wb') as f:
    async for x in c.stream():
     if x['type']=='audio':f.write(x['data'])
     elif x['type']=='WordBoundary':words.append({k:x[k] for k in ['offset','duration','text']})
   assert words
   stem.with_suffix('.words.json').write_text(json.dumps(words,ensure_ascii=False),encoding='utf-8')
   print('Narration ready:',s['id'],flush=True);return
  except Exception as e:
   print(type(e).__name__,s['id'],attempt+1,flush=True)
   if attempt==2:raise
   await asyncio.sleep(2)
async def main():
 for s in P['scenes']:await make(s)
asyncio.run(main())
