from pathlib import Path
import importlib.util,json,math,sys,subprocess,time,functools
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('previous_renderer',R/'base_helpers.py');old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
P=json.loads((R/'project.json').read_text(encoding='utf-8'));T=json.loads((R/'timing.json').read_text(encoding='utf-8'));S=json.loads((R/'scenario.json').read_text(encoding='utf-8'))
old.P=P;old.T=T;old.SC={s['id']:s for s in P['scenes']}
W,H,FPS=1920,1080,30;BG=old.BG;INK=old.INK;BLUE=old.BLUE;GREEN=old.GREEN;MUTED=old.MUTED;LINE=old.LINE;RED='#C35C6B';GOLD='#AB925C'
rr=old.rr;logo=old.logo;font=old.font;ease=old.ease;FF=old.FF
def text(im,xy,s,size=32,color=INK,bold=False,anchor=None,cn=False):
 old.text(im,xy,str(s),size,color,bold,anchor,cn)
def title(im,a,b=None):
 text(im,(110,132),a,52,INK,True)
 if b:text(im,(113,210),b,25,MUTED)
def money(v):return f'${v:,.0f}'
def header(im,s):
 logo(im,62,29,42);text(im,(119,30),'ValueRange',28,INK,True)
 steps=['OPPORTUNITY','STRATEGY','ADAPT','RESULTS'];a=0 if s==1 else 1 if s in [2,3,6] else 2 if s in [7,11] else 3
 if s not in [9,10]:
  for i,q in enumerate(steps):text(im,(1030+i*198,38),q,18,BLUE if a==i else MUTED,a==i)
 if s in [6,7,8]:text(im,(1810,91),'SIMULATION · 模拟演示',19,MUTED,anchor='ra',cn=True)
 if s==9:text(im,(1848,42),'FUTURE CONCEPT · NOT YET BUILT',19,MUTED,anchor='ra')
def small_note(im,s):text(im,(960,895),s,21,MUTED,anchor='ma')
def card(im,x,y,w,h,tag,value,detail,color=BLUE):
 rr(im,(x,y,x+w,y+h),'white',24,LINE,2);text(im,(x+32,y+28),tag,22,color,True);text(im,(x+32,y+(85 if h>250 else 68)),value,58 if h>250 else 48,color,True)
 if detail:text(im,(x+32,y+h-46),detail,23,MUTED)
def chart(im,points,keys,colors,box,day=None,price=False,maxday=1825):
 x,y,w,h=box;d=ImageDraw.Draw(im);values=[p[k] for p in points for k in keys];lo=0;hi=math.ceil(max(values)*1.08/(50 if price else 10000))*(50 if price else 10000)
 X=lambda day:x+w*day/maxday;Y=lambda v:y+h-h*(v-lo)/(hi-lo)
 for j in range(4):
  v=hi*j/3;yy=Y(v);d.line((x,yy,x+w,yy),fill=LINE,width=2);text(im,(x-18,yy-14),money(v),23,MUTED,anchor='ra')
 for i in range(6):text(im,(X(i*365),y+h+18),f'{i} yr',22,MUTED,anchor='ma')
 for k,col in zip(keys,colors):
  xy=[(X(p['day']),Y(p[k])) for p in points[::5]]+[(X(points[-1]['day']),Y(points[-1][k]))];d.line(xy,fill=col,width=4,joint='curve')
 if day is not None:
  xx=X(day)
  for yy in range(round(y),round(y+h),14):d.line((xx,yy,xx,yy+7),fill=MUTED,width=2)
  p=points[min(len(points)-1,int(day))]
  for k,col in zip(keys,colors):
   yy=Y(p[k]);d.ellipse((xx-7,yy-7,xx+7,yy+7),fill=col)
 return X,Y
def exposure(im,p,x,y,w):
 d=ImageDraw.Draw(im);stock=p['stock']*p['price']/p['nav'];cash=1-stock
 rr(im,(x,y,x+w,y+20),'#E6EAF5',10);rr(im,(x,y,x+w*stock,y+20),BLUE,9)
 d.rectangle((x+w*stock,y,x+w,y+20),fill=GOLD)
 text(im,(x,y+43),f'Shares  {stock:.1%}',28,BLUE,True);text(im,(x+w,y+43),f'Cash  {cash:.1%}',28,GOLD,True,'ra')
def allocation(im,p,x,y,w,label):
 rr(im,(x,y,x+w,y+205),'white',23,LINE,2);text(im,(x+25,y+20),label,27,INK,True)
 vals=p['sleeves'];total=sum(vals);cols=[BLUE,GREEN,'#9CAEDF',GOLD];xx=x+25
 for v,c in zip(vals,cols):
  ww=(w-50)*v/total
  if ww>0:ImageDraw.Draw(im).rectangle((xx,y+76,xx+ww,y+95),fill=c)
  xx+=ww
 for i,(name,v,c) in enumerate(zip(['Core','Active','Shares','Cash'],vals,cols)):
  xx=x+25+i*(w-50)/4;text(im,(xx,y+115),name,20,MUTED);text(im,(xx,y+150),f'{v/total:.1%}',29,c,True)
def draw_scene(im,s,u,d,t):
 cues=[c for c in T['cues'] if c['scene']==s];ci=max(0,sum(t>=c['start'] for c in cues)-1)
 if s==1:
  title(im,'Stocks are moving onchain','A growing asset base. An active trading market.')
  card(im,110,310,810,360,'GLOBAL · TOKENIZED STOCKS + ETFs','$3B+','Onchain distributed value',BLUE)
  card(im,1000,310,810,360,'SOLANA · SEPTEMBER 2026','$4.4B','Monthly tokenized-stock trading volume',GREEN)
  text(im,(145,705),'RWA.xyz · 11 Oct 2026 · $3.33B',21,MUTED)
  text(im,(1033,705),'Solana Foundation · 6 Oct 2026',21,MUTED)
  if ci==2:text(im,(960,795),'How can holders participate?',46,INK,True,'ma')
  small_note(im,'Asset value and trading volume are different measures · Sources: app.rwa.xyz/stocks / solana.com')
 elif s==2:
  title(im,'A strategy for how you hold','Company valuation → AI allocation → AMM liquidity')
  for j,(a,b,c) in enumerate([('SHARES','Participate in growth',BLUE),('LIQUIDITY','Earn trading fees',GREEN),('CASH','Keep room to adapt',GOLD)]):
   x=110+j*580;rr(im,(x,321,x+540,663),'white',26,LINE,2);text(im,(x+35,359),a,24,c,True);text(im,(x+35,457),b,34,INK,True)
   ImageDraw.Draw(im).line((x+35,578,x+490,578),fill=c,width=5)
  text(im,(960,765),'Which ranges?   How much capital?   When to adjust?',36,INK,True,'ma')
  small_note(im,'AMM liquidity converts stocks and cash as trades move through the range')
 elif s==3:
  title(im,'Company value becomes a strategy','Research informs the ranges. Code checks the allocation.')
  if ci==0:
   old.still(im,'financial-inputs.png',(236,155,807,483),(110,293,998,597),new=True)
   for j,(a,b) in enumerate([('Business model','How the company creates value'),('Operating assumptions','Growth · Margins · Risk'),('Valuation','Bear · Base · Bull')]):
    yy=304+j*190;rr(im,(1160,yy,1810,yy+153),'white',22,LINE,2);text(im,(1190,yy+26),a,32,INK,True);text(im,(1190,yy+88),b,24,MUTED)
  else:
   for j,(a,b) in enumerate([('Valuation','Company-specific model'),('AI proposal','Market · Inventory · Goals'),('Portfolio','Core · Active · Shares · Cash')]):
    x=110+j*580;rr(im,(x,335,x+540,637),'white',25,LINE,2);text(im,(x+35,370),f'0{j+1}',26,BLUE,True);text(im,(x+35,428),a,41,INK,True);text(im,(x+35,554),b,25,MUTED)
   text(im,(960,754),'AI proposes     Code calculates     You review',39,BLUE,True,'ma')
  small_note(im,'Archived financial research and strategy proposal · User review before execution')
 elif s==6:
  title(im,'Five years. Two rallies and pullbacks.','$10,000 initial capital · Starting share price $92.02')
  # Show the actual original market until the event; the final-year continuation is introduced next.
  progress=ease(min(1,u/max(1,d-4)));day=round(progress*S['eventDay']);p=S['original'][day]
  rr(im,(110,278,1810,642),'white',24,LINE,2)
  chart(im,S['original'][:S['eventDay']+1],['price'],[BLUE],(222,312,1520,248),day,True)
  xx=222+1520*1460/1825;ImageDraw.Draw(im).line((xx,312,xx,560),fill=GREEN,width=2)
  text(im,(xx,281),'New facts at year 4',20,GREEN,anchor='ma')
  card(im,110,677,470,197,'OBSERVATION',f'Year {day/365:.1f}',f'Share price ${p["price"]:.2f}',BLUE)
  rr(im,(622,677,1810,874),'white',24,LINE,2);text(im,(655,700),'The portfolio changes with the market',27,INK,True)
  exposure(im,p,655,758,1114)
  small_note(im,'Illustrative path · Core 14% / Active 37.3% fee APR assumptions · Fees already included in assets')
 elif s==7:
  title(im,'New facts. An updated plan.','End of year 4 · Evidence → Valuation → Portfolio')
  if ci<2:
   items=[('New company facts','Growth and profitability improve'),('Valuation review','Revisit the business assumptions'),('New positioning','Update liquidity ranges and inventory')]
   for j,(a,b) in enumerate(items):
    yy=304+j*175;rr(im,(160,yy,1760,yy+140),'#EEF1FF' if j<=ci else 'white',24,LINE,2);text(im,(200,yy+40),f'0{j+1}',30,BLUE,True);text(im,(299,yy+26),a,34,INK,True);text(im,(299,yy+82),b,25,MUTED)
  else:
   allocation(im,S['before'],110,295,800,'Before the review');allocation(im,S['after'],1010,295,800,'After the review')
   text(im,(960,374),'→',48,BLUE,True,'ma')
   rr(im,(110,536,1810,829),'white',24,LINE,2)
   text(im,(147,571),'CORE RANGE',23,BLUE,True);text(im,(147,622),'$79.72 — $328.13',45,BLUE,True)
   text(im,(970,571),'ACTIVE',23,GREEN,True);text(im,(970,622),'Pause the old position',40,INK,True)
   text(im,(147,748),'Strategy principal allocation · Retained fees stay separate',29,MUTED)
  small_note(im,'Preset AI response in this simulation · Review and authorization precede real execution')
 elif s==8:
  title(im,'Same market. Different decisions.','$10,000 start · 5 years · Final share price $251')
  rr(im,(110,271,1810,592),'white',24,LINE,2)
  chart(im,S['points'],['nav','fixed','pure'],[BLUE,'#A481BD','#909DB8'],(220,300,1516,221))
  for j,(lab,col) in enumerate([('Revised strategy',BLUE),('Original strategy','#A481BD'),('Buy and hold','#909DB8')]):
   xx=270+j*530;ImageDraw.Draw(im).line((xx,578,xx+24,578),fill=col,width=4);text(im,(xx+34,560),lab,22,MUTED)
  for j,(label,val,col) in enumerate([('REVISED STRATEGY',S['final']['revised'],BLUE),('ORIGINAL STRATEGY',S['final']['fixed'],'#A481BD'),('BUY AND HOLD',S['final']['hold'],'#909DB8')]):card(im,110+j*580,621,540,192,label,money(val),'Final portfolio assets',col)
  text(im,(130,846),f'+{money(S["final"]["excess"])} vs buy and hold',29,GREEN,True)
  text(im,(1785,846),f'{money(S["final"]["fees"])} trading fees included',29,GREEN,True,'ra')
  small_note(im,'Illustrative results, not a forecast · No tax, slippage or execution costs · Fees are part of total assets')
 elif s==11:
  title(im,'Learn from every iteration','Monitor → Review → Attribute → Improve')
  old.still(im,'research-detail.png',(427,274,751,133),(200,282,1520,269),new=True)
  ImageDraw.Draw(im).rectangle((214,503,701,549),fill='white')
  text(im,(960,575),'Archived research: 16 Sep 2026 · Watch · Valuation unchanged',24,GREEN,True,'ma')
  for j,(a,b) in enumerate([('Research','News and financial reports'),('Portfolio','Positions and asset value'),('Iteration','Attribution and rule review')]):
   x=110+j*580;rr(im,(x,646,x+540,826),'white',23,LINE,2);text(im,(x+30,675),a,32,INK,True);text(im,(x+30,742),b,25,MUTED)
  small_note(im,'Existing research records · No live AI scan or automatic rule changes shown')
 elif s in [9,10]:old.scene(im,s,u,d,t)

def frame(t):
 s=next((s for s in P['scenes'] if s['start']<=t<s['start']+s['duration']),P['scenes'][-1]);im=Image.new('RGB',(W,H),BG)
 if s['id']!=10:header(im,s['id'])
 draw_scene(im,s['id'],t-s['start'],s['duration'],t);old.footer(im,t)
 u=t-s['start'];fade=1
 if u<.2 and s!=P['scenes'][0]:fade=ease(u/.2)
 if s['id']!=10 and s['duration']-u<.16:fade*=ease((s['duration']-u)/.16)
 if t>P['duration']-.65:fade*=ease((P['duration']-t)/.65)
 return Image.blend(Image.new('RGB',(W,H),BG),im,fade) if fade<1 else im
def previews():
 out=R/'preview';out.mkdir(exist_ok=True);times=[(c['start']+c['end'])/2 for c in T['cues']];thumbs=[]
 for i,t in enumerate(times):
  im=frame(t);im.save(out/f'{i:02d}-{t:.1f}s.jpg',quality=94);thumb=im.resize((480,270));text(thumb,(8,5),f'{t:.1f}s',17,INK,True);thumbs.append(thumb)
 sheet=Image.new('RGB',(1920,math.ceil(len(thumbs)/4)*270),'white')
 for i,im in enumerate(thumbs):sheet.paste(im,((i%4)*480,(i//4)*270))
 sheet.save(R/'contact-sheet.jpg',quality=94);frame(times[1]).save(R/'poster.jpg',quality=95)
if __name__=='__main__':
 previews()
 if '--preview' not in sys.argv:
  output=R/'ValueRange-Draft-v6-EN-ZH.mp4';log=(R/'render.log').open('w',encoding='utf-8')
  args=[FF,'-y','-v','warning','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r',str(FPS),'-i','-','-i',str(R/'audio/mix.wav'),'-map','0:v','-map','1:a','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-af','loudnorm=I=-16:TP=-1.2:LRA=8','-ar','48000','-movflags','+faststart','-t',str(P['duration']),str(output)]
  proc=subprocess.Popen(args,stdin=subprocess.PIPE,stderr=log);n=round(P['duration']*FPS);st=time.time()
  for i in range(n):
   proc.stdin.write(frame(i/FPS).tobytes())
   if i%300==0:print(f'{i}/{n} frames; {time.time()-st:.1f}s',flush=True)
  proc.stdin.close();code=proc.wait();log.close();assert code==0
  print('Exported',output.name,output.stat().st_size,flush=True)
