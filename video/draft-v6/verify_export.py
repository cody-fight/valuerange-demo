from pathlib import Path
import json,sys,re,subprocess,math,hashlib
import numpy as np
from PIL import Image
from render import frame,FF,font
R=Path(__file__).resolve().parent;video=R/'ValueRange-Draft-v6-EN-ZH.mp4';P=json.loads((R/'project.json').read_text(encoding='utf-8'));T=json.loads((R/'timing.json').read_text(encoding='utf-8'));S=json.loads((R/'scenario.json').read_text(encoding='utf-8'))
def run(args):return subprocess.run([FF,*args],capture_output=True,text=True,encoding='utf-8',errors='replace')
info=run(['-hide_banner','-i',str(video)]).stderr
assert all(x in info for x in ['1920x1080','30 fps','Video: h264','Audio: aac']),info
m=re.search(r'Duration: (\d+):(\d+):([\d.]+)',info);duration=int(m[1])*3600+int(m[2])*60+float(m[3]);assert abs(duration-P['duration'])<.1;assert 175<duration<=195
r=run(['-v','error','-i',str(video),'-f','null','-']);assert r.returncode==0 and not r.stderr.strip(),r.stderr
l=run(['-hide_banner','-i',str(video),'-af','loudnorm=I=-16:TP=-1.2:LRA=8:print_format=json','-f','null','-']);m=re.search(r'\{\s*"input_i"[\s\S]+?\}',l.stderr);metrics=json.loads(m[0]);assert -17.5<float(metrics['input_i'])<-14.5;assert float(metrics['input_tp'])<-.5
def lines(s,n,cn):
 units=list(s) if cn else s.split();result=[];line=''
 for w in units:
  q=line+('' if cn or not line else ' ')+w
  if font(n,False,cn).getlength(q)>1740 and line:result.append(line);line=w
  else:line=q
 if line:result.append(line)
 return result
assert all(0<=c['start']<c['end']<duration for c in T['cues'])
assert all(a['end']<=b['start'] for a,b in zip(T['cues'],T['cues'][1:]))
for c in T['cues']:
 assert c['end']-c['start']>2
 en=lines(c['en'],33,False);zh=lines(c['zh'],28,True)
 assert 942+len(en)*40+len(zh)*36<=1080, c
assert all(s['duration']>0 for s in P['scenes'])
out=R/'encoded-qa';out.mkdir(exist_ok=True);checks=[]
for c in T['cues']:
 sec=round((c['start']+c['end'])/2*30)/30;dst=out/f'{sec:06.2f}.jpg'
 subprocess.run([FF,'-v','error','-y','-ss',str(sec),'-i',str(video),'-frames:v','1','-q:v','2',str(dst)],check=True)
 a=np.asarray(Image.open(dst).convert('RGB')).astype(np.float32);b=np.asarray(frame(sec)).astype(np.float32);mse=float(np.mean((a-b)**2));psnr=10*math.log10(255**2/max(mse,.00001));checks.append(dict(second=sec,psnr=round(psnr,2)))
assert all(c['psnr']>30 for c in checks)
for n,digest in S['manifest'].items():assert hashlib.sha256((R/'frozen'/n).read_bytes()).hexdigest()==digest
assert S['final']['excess']==S['final']['revised']-S['final']['hold']
report=dict(file=video.name,duration=duration,resolution=[1920,1080],fps=30,bytes=video.stat().st_size,sha256=hashlib.sha256(video.read_bytes()).hexdigest(),fullDecode='passed',subtitleTiming='passed',subtitleLayout='passed',subtitleCues=len(T['cues']),loudness=metrics,frameChecks=checks,scenarioChecks=S['checks'],scenarioResult=S['final'],minSubtitleSeconds=min(c['end']-c['start'] for c in T['cues']))
(R/'qa.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in report.items() if k!='frameChecks'},indent=2))
