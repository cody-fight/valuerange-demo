from pathlib import Path
import sys,json,math,bisect,functools,subprocess,time
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent;OLD=ROOT.parent/'draft-v1';BASE=ROOT.parent/'draft-v2';V3=ROOT.parent/'draft-v3';V4=ROOT.parent/'draft-v4'
sys.path.insert(0,str(ROOT.parent/'.tools/python'))
import imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe()
P=json.loads((ROOT/'project.json').read_text(encoding='utf-8'));T=json.loads((ROOT/'timing.json').read_text(encoding='utf-8'))
SC={s['id']:s for s in P['scenes']}
W,H,FPS=1920,1080,30;BG='#F7F8FC';INK='#19233A';BLUE='#344CEC';GREEN='#009284';MUTED='#68738B';LINE='#DEE3ED'
@functools.lru_cache(None)
def font(n,bold=False,cn=False):return ImageFont.truetype('C:/Windows/Fonts/'+('msyh.ttc' if cn else 'segoeuib.ttf' if bold else 'segoeui.ttf'),n)
def text(im,xy,s,size=36,color=INK,bold=False,anchor=None,cn=False):ImageDraw.Draw(im).text(xy,s,font=font(size,bold,cn),fill=color,anchor=anchor)
def rr(im,box,fill='white',radius=24,outline=None,width=1):ImageDraw.Draw(im).rounded_rectangle(tuple(map(int,box)),radius,fill=fill,outline=outline,width=width)
def ease(t):t=max(0,min(1,t));return t*t*(3-2*t)
def logo(im,x,y,s):
 d=ImageDraw.Draw(im);r=s/40;rr(im,(x,y,x+s,y+s),BLUE,round(12*r))
 def pts(a):return [(x+i*r,y+j*r) for i,j in a]
 d.line(pts([(14,11),(10,11),(10,29),(14,29)]),fill='white',width=max(2,round(2.5*r)),joint='curve');d.line(pts([(26,11),(30,11),(30,29),(26,29)]),fill='white',width=max(2,round(2.5*r)),joint='curve');d.line(pts([(14,20),(26,20)]),fill='#ABB6FD',width=max(2,round(2*r)));d.ellipse((x+16.5*r,y+16.5*r,x+23.5*r,y+23.5*r),fill='#7EF0C8')
@functools.lru_cache(maxsize=24)
def imgfile(path):return Image.open(path).convert('RGB')
def panel(im,a,rect,box,border=True):
 x,y,w,h=rect;X,Y,BW,BH=box
 a=a.crop((round(x*1.5),round(y*1.5),round((x+w)*1.5),round((y+h)*1.5)))
 a=a.resize((round(BW),round(BH)),Image.Resampling.BICUBIC)
 if border:rr(im,(X-2,Y+7,X+BW+2,Y+BH+10),'#E8ECF4',20)
 mask=Image.new('L',a.size,0);ImageDraw.Draw(mask).rounded_rectangle((0,0,BW-1,BH-1),18,fill=255)
 im.paste(a,(round(X),round(Y)),mask)
 if border:rr(im,(X,Y,X+BW,Y+BH),None,18,LINE,2)
def still(im,name,rect,box,new=False):
 p=(ROOT if new else OLD)/'assets'/name
 if new and not p.exists():p=V4/'assets'/name
 if new and not p.exists():p=V3/'assets'/name
 if new and not p.exists():p=BASE/'assets'/name
 panel(im,imgfile(str(p)),rect,box)
CAP={}
def pointer(im,x,y,pulse=0):
 d=ImageDraw.Draw(im)
 if pulse>0:
  r=round(18+34*(1-pulse));d.ellipse((x-r,y-r,x+r,y+r),outline=BLUE,width=max(1,round(5*pulse)))
 pts=[(x,y),(x+3,y+33),(x+11,y+24),(x+18,y+38),(x+26,y+34),(x+18,y+20),(x+30,y+18)]
 d.polygon([(a+2,b+3) for a,b in pts],fill='#CDD3E0');d.polygon(pts,fill='white');d.line(pts+[pts[0]],fill=INK,width=2,joint='curve')
def clip(im,name,at,rect=(172,80,921,615),box=(341,104,1238,827),cursor=True):
 cap=CAP[name];times=[f['t'] for f in cap['frames']];idx=max(0,bisect.bisect_right(times,at)-1);f=cap['frames'][idx]
 a=imgfile(str(Path(cap['source'])/f"{f['i']:05d}.jpg"));panel(im,a,rect,box)
 if cursor and cap['events']:
  ev=cap['events'];j=max(0,bisect.bisect_right([e['t'] for e in ev],at)-1);e=ev[j];x,y=e['x'],e['y']
  if j+1<len(ev):
   n=ev[j+1];p=ease((at-e['t'])/max(.001,n['t']-e['t']));x=x+(n['x']-x)*p;y=y+(n['y']-y)*p
  rx,ry,rw,rh=rect;bx,by,bw,bh=box
  if rx<=x<=rx+rw and ry<=y<=ry+rh:
   clicks=[v for v in ev if v['kind'] in ('click','down') and 0<=at-v['t']<.55];pulse=max([1-(at-v['t'])/.55 for v in clicks],default=0)
   pointer(im,bx+(x-rx)*bw/rw,by+(y-ry)*bh/rh,pulse)
def label(im,main,sub=None):
 text(im,(105,135),main,48,INK,True)
 if sub:text(im,(108,198),sub,24,MUTED)
def footer(im,t):
 cue=next((c for c in T['cues'] if c['start']<=t<c['end']),None)
 if not cue:return
 def wrap(s,n,cn=False):
  units=list(s) if cn else s.split();lines=[];line=''
  for w in units:
   test=line+('' if cn or not line else ' ')+w
   if font(n,False,cn).getlength(test)>1740 and line:lines.append(line);line=w
   else:line=test
  if line:lines.append(line)
  return lines
 en=wrap(cue['en'],33);zh=wrap(cue['zh'],28,True)
 y=942
 ImageDraw.Draw(im).rectangle((0,936,W,H),fill=BG)
 for line in en:text(im,(960,y),line,33,INK,False,'ma');y+=40
 for line in zh:text(im,(960,y+1),line,28,MUTED,False,'ma',True);y+=36
def header(im,s):
 logo(im,62,29,42);text(im,(119,30),'ValueRange',28,INK,True)
 if 3<=s<=8 or s==11:
  steps=['VALUE','ALLOCATE','SIMULATE','REVALUE','COMPARE'];active={3:0,4:1,5:2,6:2,7:3,8:4,11:3}[s]
  for i,q in enumerate(steps):
   x=804+176*i;text(im,(x,37),q,19,BLUE if i==active else MUTED,i==active)
   if i==active:rr(im,(x,68,x+109,71),BLUE,2)
 elif s==9:text(im,(1848,42),'FUTURE CONCEPT · NOT YET BUILT',19,MUTED,anchor='ra')
 if 5<=s<=8:text(im,(1850,91),'HYPOTHETICAL SCENARIO',17,MUTED,anchor='ra')
 if s==11:text(im,(1850,91),'ARCHIVED RESEARCH · SEPTEMBER 2026',17,MUTED,anchor='ra')
 if s==8:text(im,(341,80),'Same $10,000 start · Same path · Review at year 2',17,MUTED)
def scene(im,s,u,d,t):
 cue=[c for c in T['cues'] if c['scene']==s];ci=max(0,sum(t>=c['start'] for c in cue)-1)
 if s==1:
  text(im,(115,220),'Believe in the business',64,INK,True);text(im,(119,312),'Plan for the journey',46,BLUE,True)
  text(im,(120,397),'Long-term conviction · Everyday price swings',27,MUTED)
  D=ImageDraw.Draw(im);pts=[];p=min(1,u/6)
  for j in range(max(2,int(420*p))):
   v=j/419;x=180+1560*v;y=724-190*v-75*math.sin(v*math.pi*6)*math.sin(math.pi*v);pts.append((x,y))
  D.line((175,797,1770,797),fill=LINE,width=2);D.line(pts,fill=BLUE,width=6,joint='curve');x,y=pts[-1];D.ellipse((x-9,y-9,x+9,y+9),fill=BLUE)
  text(im,(1780,830),'Illustration',19,MUTED,anchor='ra')
 elif s==2:
  label(im,'A holding can do more','Tokenized stocks on Solana')
  cards=[('COMPANY GROWTH','Keep share exposure',BLUE),('TRADING FEES','Provide liquidity',GREEN),('INVENTORY','Convert with the plan','#9B79B8')]
  for j,(a,b,col) in enumerate(cards):
   p=ease((u-j*.35)/.75);x=105+j*584;y=310+round(55*(1-p));rr(im,(x,y,x+550,y+299),'white',28,LINE,2)
   text(im,(x+38,y+44),a,24,col,True);text(im,(x+38,y+139),b,32,INK,True)
   D=ImageDraw.Draw(im);D.line((x+42,y+218,x+466,y+218),fill=LINE,width=3);v=(u*.12+j*.25)%1;D.ellipse((x+42+424*v-6,y+212,x+42+424*v+6,y+224),fill=col)
  if u>4.4:text(im,(960,739),'How much?   At what prices?   When to adjust?',43,INK,True,'ma')
 elif s==3:
  if t<cue[1]['start']:
   p=ease(u/.7);logo(im,855,250,210);text(im,(960,510),'ValueRange',76,INK,True,'ma');text(im,(960,625),'Company value → On-chain strategy',39,BLUE,False,'ma')
  elif ci in [1,2]:
   label(im,'A model built around the business','Financial research → Company-specific assumptions → Valuation')
   p=ease((t-cue[1]['start'])/.6)
   still(im,'financial-inputs.png',(236,155,807,483),(106,298+round((1-p)*20),956,572),new=True)
   # The document is supporting evidence; the large labels carry the explanation.
   ImageDraw.Draw(im).rectangle((0,888,W,936),fill=BG)
   items=[('Business model','How the company creates value'),('Financial assumptions','Growth, profitability and risk'),('Valuation method','Chosen to fit the business')]
   for j,(a,b) in enumerate(items):
    yy=300+j*183;rr(im,(1111,yy,1810,yy+148),'white',24,LINE,2)
    text(im,(1143,yy+25),a,32,INK,True);text(im,(1143,yy+79),b,23,MUTED)
    if ci==2:
     q=ease((t-cue[2]['start']-j*.8)/.7)
     if q>0:rr(im,(1111,yy+18,1115,yy+18+round(110*q)),BLUE,2)
   text(im,(960,902),'CIRCLE research case · Financial inputs and a dated valuation model',21,MUTED,anchor='ma')
  elif ci==3:
   label(im,'Start with company value','Financial data → Business assumptions → Bear / Base / Bull')
   still(im,'plan-v027.png',(187,631,892,351),(217,281,1486,585),new=True)
   # Keep the clean, readable portion above subtitles.
   ImageDraw.Draw(im).rectangle((0,890,W,936),fill=BG);text(im,(960,901),'A valuation model suited to the company',22,MUTED,anchor='ma')
  else:
   label(im,'AI proposes   Code calculates   You review')
   items=['Company valuation','Market indicators','Current inventory','Holding goals']
   for j,a in enumerate(items):
    yy=280+j*131;rr(im,(110,yy,670,yy+94),'white',20,LINE,2);text(im,(148,yy+26),a,30,INK,True)
    D=ImageDraw.Draw(im);D.line((688,yy+47,882,525),fill='#C8D0FA',width=3)
    p=(u*.4+j*.23)%1;D.ellipse((688+(882-688)*p-5,yy+47+(525-yy-47)*p-5,688+(882-688)*p+5,yy+47+(525-yy-47)*p+5),fill=BLUE)
   rr(im,(900,367,1790,694),'white',30,LINE,2);logo(im,951,411,75);text(im,(1052,419),'A constrained strategy',38,INK,True);text(im,(951,534),'Ranges · Capital · Lifecycle',33,BLUE,True);text(im,(951,598),'AMM math and conditions checked by code',25,MUTED)
   text(im,(960,862),'Prepared AI proposal · User review before execution',23,MUTED,anchor='ma')
 elif s==4:
  if u<d-2.4:clip(im,'plan-scroll',min(CAP['plan-scroll']['duration']-.15,u*.9))
  else:clip(im,'plan-to-simulation',(u-(d-2.4))*CAP['plan-to-simulation']['duration']/2.4)
 elif s==5:
  second=cue[1]['start']-SC[5]['start'];select_at=second+1.45
  label(im,'Explore one to five years' if u<select_at else 'For this example, three years','Choose the horizon, then a path with rallies and pullbacks')
  for j in range(5):
   xx=162+j*340;chosen=(j==2 and u>=select_at)
   rr(im,(xx,260,xx+280,333),BLUE if chosen else 'white',18,None if chosen else LINE,2)
   text(im,(xx+140,280),str(j+1)+' year'+('s' if j else ''),27,'white' if chosen else INK,chosen,'ma')
  name='horizon-five.png' if u<select_at else 'horizon-three.png'
  pan=ease((u-select_at-1.05)/.85)
  still(im,name,(196,363+464*pan,889,296),(161,380,1598,532),new=True)
  if second-.3<u<select_at+1.05:
   p=ease((u-second+.3)/1.3);xx=830+(620-830)*p;yy=540+(575-540)*p
   pointer(im,xx,yy,max(0,1-(u-select_at)/.5) if select_at<=u<select_at+.5 else 0)
 elif s==6:
  # The same continuous capture supplies both the scrubber and the inventory panel.
  cap=CAP['inventory-cycle']
  anchors=[0]+[c['start']-SC[6]['start'] for c in cue[1:]]+[d]
  at=float(np.interp(u,anchors,[0,3.754,9.479,11.777,cap['duration']-.05]))
  clip(im,'inventory-cycle',at,(189,88,890,110),(135,137,1650,204))
  clip(im,'inventory-cycle',at,(189,283,890,433),(351,349,1218,593),cursor=False)
 elif s==11:
  label(im,'A thesis kept under review','Daily monitoring → Business impact → Valuation review')
  if ci==0:
   q=t-cue[0]['start'];k=0 if q<1.6 else 1 if q<3.4 else 2
   still(im,f'research-091{4+k}.png',(420,122,778,350),(176,260,1556,700),new=True)
   ImageDraw.Draw(im).rectangle((0,908,W,936),fill=BG)
   if .55<q<4.1:
    x=float(np.interp(q,[.55,1.6,2.5,3.4],[680,960,1100,1460]));yy=749
    pulse=max([max(0,1-(q-a)/.45) for a in [1.6,3.4] if q>=a],default=0)
    pointer(im,x,yy,pulse)
  else:
   # A readable crop of the original research trace, with the version outcome intact.
   still(im,'research-detail.png',(427,274,751,133),(200,280,1520,269),new=True)
   # Hide the first column's partial body line; retain the original complete headings.
   ImageDraw.Draw(im).rectangle((214,501,701,546),fill='white')
   rr(im,(340,577,1580,644),'#ECF5F2',18)
   text(im,(960,594),'Archived decision: Watch · Valuation unchanged',25,GREEN,True,'ma')
   if ci==1:
    items=[('Financial inputs','2026 Q2'),('Valuation model','2026.08.22'),('AI proposal','2026.08.24'),('Daily research','09.14–09.16')]
    for j,(a,b) in enumerate(items):
     xx=205+j*383;pp=ease((t-cue[1]['start']-j*.18)/.5);yy=702+round((1-pp)*22)
     rr(im,(xx,yy,xx+360,yy+119),'white',17,LINE,2);text(im,(xx+21,yy+19),a,24,INK,True);text(im,(xx+21,yy+66),b,23,BLUE)
   else:
    rr(im,(270,702,1650,823),'white',22,LINE,2)
    text(im,(960,739),'Evidence checked   →   Assumptions reviewed   →   Decision recorded',28,INK,True,'ma')
   text(im,(960,883),'Sources and versions retained · Archived research, not a live scan',21,MUTED,anchor='ma')
 elif s==7:
  if ci==0:
   label(im,'When the business changes','Hypothetical improvement · Operating assumptions support a new valuation')
   still(im,'improvement-factors.png',(395,128,816,232),(145,350,1632,464),new=True)
   # Highlight the three business factors without reproducing the calculation table.
   q=t-cue[0]['start'];j=min(2,max(0,int(q/1.5)));xx=158+j*546
   rr(im,(xx,423,xx+519,705),None,20,BLUE,3)
  elif ci==1:
   label(im,'Revalue the business')
   still(im,'revalue-after.png',(188,799,889,365),(161,292,1598,656),new=True)
  elif ci==2:
   label(im,'Hold more shares   Pause Active')
   still(im,'revalue-after.png',(187,1170,892,347),(177,300,1566,609),new=True)
  else:
   label(im,'Test the matching market assumption')
   at=max(0,(t-cue[3]['start'])*.8);clip(im,'choose-growth-path',at,(188,102,890,480),(325,242,1270,685))
 elif s==8:
  last=cue[-1]['start']-SC[8]['start']
  if u<last:
   if u<last-1.8:clip(im,'compare-growth',max(0,u/(last-1.8)*CAP['compare-growth']['duration']))
   else:clip(im,'compare-end',CAP['compare-end']['duration']-.05)
  else:
   label(im,'Understand where the difference came from','Revised plan versus the original strategy · Same price path')
   still(im,'compare-end.png',(188,1580,888,395),(280,273,1360,605),new=True)
   ImageDraw.Draw(im).rectangle((0,890,W,936),fill=BG);text(im,(960,902),'Hypothetical example · Fees already included in portfolio assets',21,MUTED,anchor='ma')
 elif s==9:
  if ci<3:
   label(im,'One strategy, two ways to use it','Bring valuation-driven strategies to more people')
   q=t-cue[ci]['start']
   if ci==0:
    for j,(title,subtitle) in enumerate([('Managed vault','Deposit assets · Delegate the strategy'),('Self-custody agent','Keep control · Set your own limits')]):
     x=105+j*876;y=334+round(22*(1-ease((q-j*.15)/.65)))
     rr(im,(x,y,x+834,y+394),'white',28,LINE,2)
     text(im,(x+42,y+42),'0'+str(j+1),25,BLUE,True)
     text(im,(x+42,y+131),title,46,INK,True)
     text(im,(x+42,y+240),subtitle,28,MUTED)
    text(im,(960,821),'One research foundation · Two ways to participate',25,MUTED,anchor='ma')
   else:
    for j,(a,b) in enumerate([('Managed vault','Delegate the strategy'),('Self-custody agent','Keep control of your assets')]):
     active=j==ci-1;y=335+j*260
     rr(im,(105,y,646,y+218),'#EEF1FF' if active else 'white',26,BLUE if active else LINE,2)
     text(im,(141,y+28),'0'+str(j+1),23,BLUE if active else MUTED,True)
     text(im,(141,y+80),a,37,INK if active else MUTED,True)
     text(im,(141,y+148),b,25,BLUE if active else MUTED)
    if ci==1:
     still(im,'vault-deposit.png',(172,455,920,463),(706,312,1104,556),new=True)
     # A restrained moving accent points from the deposit input toward management.
     p=ease(q/3.7);pointer(im,1600-650*p,530+240*p)
    else:
     selected=q>=2.1
     still(im,'agent-limited.png' if selected else 'agent-permissions.png',(172,864,920,578),(770,270,977,614),new=True)
     p=ease(q/2.1);x=1430-600*p;y=730-216*p
     pulse=max(0,1-(q-2.1)/.55) if selected and q<2.65 else 0
     if q<3.4:pointer(im,x,y,pulse)
    text(im,(1259,899),'Product concept preview',20,MUTED,anchor='ma')
  else:
   label(im,'One workflow for more assets')
   for j,a in enumerate(['Research','Allocate','Adapt']):
    p=ease((t-cue[3]['start'])/.6);text(im,(440+520*j,460+round((1-p)*18)),a,72,INK,True,'ma')
   text(im,(960,690),'A shared foundation for managed and self-custodial strategies',29,MUTED,anchor='ma')
 elif s==10:
  logo(im,872,240,176);text(im,(960,487),'ValueRange',78,INK,True,'ma');text(im,(960,626),'A plan for how you hold',42,BLUE,False,'ma');text(im,(960,821),'SOLANA · STOCKLANA',21,MUTED,anchor='ma')
def frame(t):
 s=next((s for s in P['scenes'] if s['start']<=t<s['start']+s['duration']),P['scenes'][-1]);im=Image.new('RGB',(W,H),BG)
 if s['id']!=10:header(im,s['id'])
 scene(im,s['id'],t-s['start'],s['duration'],t);footer(im,t)
 # Short white dissolves, never long empty holds.
 u=t-s['start'];fade=1
 if u<.20 and s['id']>1:fade=ease(u/.20)
 if s['id']!=10 and s['duration']-u<.16:fade*=ease((s['duration']-u)/.16)
 if t>P['duration']-.65:fade*=ease((P['duration']-t)/.65)
 if fade<1:im=Image.blend(Image.new('RGB',(W,H),BG),im,fade)
 return im
def previews():
 out=ROOT/'preview';out.mkdir(exist_ok=True);times=[]
 for s in P['scenes']:
  for k in ([.25,.65] if s['id'] not in (1,10) else [.5]):times.append(s['start']+s['duration']*k)
 thumbs=[]
 for i,t in enumerate(times):
  im=frame(t);im.save(out/f'{i+1:02d}-{t:.1f}s.jpg',quality=94);thumb=im.resize((480,270));text(thumb,(8,5),f'{t:.1f}s',17,INK,True);thumbs.append(thumb)
 sheet=Image.new('RGB',(1920,math.ceil(len(thumbs)/4)*270),'white')
 for i,im in enumerate(thumbs):sheet.paste(im,((i%4)*480,(i//4)*270))
 sheet.save(ROOT/'contact-sheet.jpg',quality=94);frame(P['scenes'][2]['start']+1.5).save(ROOT/'poster.jpg',quality=95)
