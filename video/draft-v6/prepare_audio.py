from pathlib import Path
import sys,json,subprocess,wave,unicodedata,math,re
import numpy as np
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parent/'.tools/python'))
import imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe();SR=48000
P=json.loads((ROOT/'project.json').read_text(encoding='utf-8'))
cues=[];report=[];parts=[];position=0;phrase_report=[]
def norm(s):return ''.join(c.lower() for c in unicodedata.normalize('NFKC',s) if c.isalnum())
def wav(path,x):
 with wave.open(str(path),'wb') as f:
  f.setnchannels(1 if x.ndim==1 else x.shape[1]);f.setsampwidth(2);f.setframerate(SR)
  f.writeframes((np.clip(x,-.99,.99)*32767).astype('<i2').tobytes())
for s in P['scenes']:
 file=ROOT/'audio'/f"scene-{s['id']:02d}.mp3"
 raw=subprocess.run([FF,'-v','error','-i',str(file),'-f','f32le','-ac','1','-ar',str(SR),'-'],stdout=subprocess.PIPE,check=True).stdout
 src=np.frombuffer(raw,dtype='<f4').copy();words=json.loads(file.with_suffix('.words.json').read_text(encoding='utf-8'))
 compact='';mapping=[]
 for w in words:
  n=norm(w['text']);mapping.append((len(compact),len(compact)+len(n),w));compact+=n
 assert compact==norm(s['en'])
 s['start']=position;s['voiceStart']=position+.34;pos=0;local=.34
 for index,c in enumerate(s['cues']):
  n=norm(c['en']);assert compact[pos:pos+len(n)]==n
  selected=[(i,w) for i,(lo,hi,w) in enumerate(mapping) if hi>pos and lo<pos+len(n)]
  first=selected[0][1];last=selected[-1][1];t0=first['offset']/1e7;t1=(last['offset']+last['duration'])/1e7
  # Cut in existing pauses, retaining word attacks and endings.
  previous=selected[0][0]-1;following=selected[-1][0]+1
  lo=max(0,t0-.085)
  if previous>=0:lo=max(lo,((words[previous]['offset']+words[previous]['duration'])/1e7+t0)/2)
  hi=min(len(src)/SR,t1+.135)
  if following<len(words):hi=min(hi,(t1+words[following]['offset']/1e7)/2)
  raw_duration=hi-lo;word_count=len(re.findall(r"[A-Za-z]+(?:[’'-][A-Za-z]+)*",c['en']))
  raw_wpm=word_count*60/raw_duration
  target=152 if s['id'] in [3,5,7,11] else 158 if s['id']<7 else 152
  tempo=max(.76,min(1.06,target/raw_wpm))
  if s['id']==9 and index==3:tempo=min(tempo,.90)
  if s['id']==10:tempo=min(tempo,.88)
  chunk=src[round(lo*SR):round(hi*SR)]
  processed=subprocess.run([FF,'-v','error','-f','f32le','-ac','1','-ar',str(SR),'-i','-','-af',f'atempo={tempo:.8f}','-f','f32le','-ac','1','-ar',str(SR),'-'],input=chunk.astype('<f4').tobytes(),stdout=subprocess.PIPE,check=True).stdout
  a=np.frombuffer(processed,dtype='<f4').copy();dur=len(a)/SR
  a*=min(.105/max(.001,float(np.sqrt(np.mean(a*a)))),.80/max(.001,float(np.max(np.abs(a)))))
  fade=min(300,len(a)//8);a[:fade]*=np.linspace(0,1,fade);a[-fade:]*=np.linspace(1,0,fade)
  # Reading time is independent of the number of spoken words.
  read_min=max(2.15,len(c['en'])/20,len(c['zh'])/12)
  if s['id']==9 and index==3:read_min=max(read_min,3.5)
  if s['id']==10:read_min=max(read_min,4.25)
  dwell=max(dur+.33,read_min)
  if s['id']==5 and index==1:dwell+=1.0
  offset=position+local;parts.append((offset,a));visible_en=c['en'];visible_zh=c['zh']
  if s['id']==9 and index==3:visible_en='Research   Allocate   Adapt';visible_zh='研究   配置   持续修正'
  if s['id']==10:visible_en='ValueRange — A plan for how you hold';visible_zh='ValueRange，让持有更有章法'
  cues.append(dict(scene=s['id'],start=offset+max(0,(t0-lo)/tempo-.04),end=offset+dwell,en=visible_en,zh=visible_zh))
  report.append(dict(scene=s['id'],cue=index,start=offset,end=offset+dur,duration=dur,tempo=tempo))
  phrase_report.append(dict(scene=s['id'],cue=index,words=word_count,rawWpm=round(raw_wpm,1),adjustedWpm=round(word_count*60/dur,1),audioDuration=round(dur,3),displayDuration=round(dwell,3),tempo=round(tempo,4)))
  gap=.22
  if s['id']==3 and index==0:gap=.55
  if s['id']==5 and index==0:gap=.50
  if s['id']==11:gap=.35
  local+=dwell+(gap if index<len(s['cues'])-1 else 0);pos+=len(n)
 s['duration']=math.ceil((local+(.85 if s['id'] in [5,11] else .70 if s['id'] in [2,4,6,8,9] else 1.3 if s['id']==10 else .50))*30)/30
 position+=s['duration']
P['duration']=position;N=round(position*SR);voice=np.zeros(N,np.float32)
for st,a in parts:voice[round(st*SR):round(st*SR)+len(a)]+=a
(ROOT/'phrase-pacing.json').write_text(json.dumps(phrase_report,indent=2),encoding='utf-8')

music=np.zeros((N,2),np.float32);rng=np.random.default_rng(20260918)
beat=60/106;chords=[[50,57,61,64,69],[47,54,57,62,66],[43,50,57,59,62],[45,52,57,59,64]]
def add(t,signal,pan=0):
 st=round(t*SR)
 if st>=N:return
 n=min(len(signal),N-st);music[st:st+n,0]+=signal[:n]*(1-pan*.3);music[st:st+n,1]+=signal[:n]*(1+pan*.3)
for bar,st in enumerate(np.arange(0,position,beat*8)):
 notes=chords[bar%4];length=min(beat*9,position-st);tt=np.arange(round(length*SR))/SR
 env=np.minimum(tt/.45,1)*np.minimum((length-tt)/.9,1)
 for k,note in enumerate(notes):
  f=440*2**((note-69)/12);tone=(np.sin(2*np.pi*f*tt)+.10*np.sin(2*np.pi*2*f*tt+.3))*.0036*env
  add(st,tone,(-1)**k*.65)
 for k in [0,1.5,3,4.5,6,7]:
  at=st+k*beat;tt=np.arange(round(1.5*SR))/SR;f=440*2**((notes[(int(k)+bar)%5]+12-69)/12)
  tone=(np.sin(2*np.pi*f*tt)+.24*np.sin(2*np.pi*f*2*tt)+.05*np.sin(2*np.pi*f*3*tt))*.030*np.exp(-tt*3.9)*(1-np.exp(-tt*150))
  add(at,tone,.6*math.sin(k));add(at+beat*.75,tone*.23,-.6*math.sin(k))
 for k in range(8):
  at=st+k*beat
  tt=np.arange(round(.14*SR))/SR
  if k%2==0:add(at,.021*np.sin(2*np.pi*(58*tt+5*(1-np.exp(-tt*35))))*np.exp(-tt*32))
  tt=np.arange(round(.045*SR))/SR;noise=rng.normal(0,1,len(tt)).astype(np.float32);noise=np.concatenate(([0],np.diff(noise)))
  add(at+beat*.5,noise*.0027*np.exp(-tt*95),.4)
# Audible but restrained: approximately 17 dB beneath the narration during speech.
music*=.015/max(1e-6,float(np.sqrt(np.mean(music**2))))
duck=np.ones(math.ceil(N/480),np.float32)
for r in report:duck[max(0,int((r['start']-.08)*100)):min(len(duck),int((r['end']+.1)*100))]=.72
duck=np.convolve(np.pad(duck,(12,12),mode='edge'),np.ones(25)/25,mode='valid')
envelope=np.interp(np.arange(N),np.arange(len(duck))*480,duck)
tt=np.arange(N)/SR;envelope*=np.minimum(tt/.9,1)*np.minimum((position-tt)/1.8,1)
music*=envelope[:,None]
# Brief original tonal transitions, never stock samples.
for s in P['scenes'][1:]:
 at=s['start'];tt=np.arange(round(.35*SR))/SR
 tone=.006*np.sin(2*np.pi*(660*tt+180*tt*tt))*np.sin(np.pi*tt/.35)**2
 add(at,tone,.25)
mix=music+voice[:,None]
wav(ROOT/'audio/narration.wav',voice);wav(ROOT/'audio/music-original.wav',music);wav(ROOT/'audio/mix.wav',mix)
def fmt(t):
 ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000);return f'{h:02}:{m:02}:{s:02},{ms:03}'
for suffix,fields in [('bilingual',['en','zh']),('en',['en']),('zh',['zh'])]:
 (ROOT/f'subtitles-{suffix}.srt').write_text('\n\n'.join(str(i+1)+'\n'+fmt(c['start'])+' --> '+fmt(c['end'])+'\n'+'\n'.join(c[k] for k in fields) for i,c in enumerate(cues)),encoding='utf-8-sig')
(ROOT/'project.json').write_text(json.dumps(P,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'timing.json').write_text(json.dumps(dict(voice=report,cues=cues),ensure_ascii=False,indent=2),encoding='utf-8')
summary=dict(duration=position,voiceSeconds=sum(r['duration'] for r in report),words=sum(len(s['en'].split()) for s in P['scenes']),musicRms=float(np.sqrt(np.mean(music**2))),voiceRms=float(np.sqrt(np.mean(voice**2))),peak=float(np.max(np.abs(mix))))
summary['voiceWpm']=summary['words']*60/summary['voiceSeconds']
(ROOT/'audio-report.json').write_text(json.dumps(summary,indent=2),encoding='utf-8');print(summary)

