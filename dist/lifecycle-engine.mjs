import {reviewDay} from './timeline.mjs';
// Demonstration execution policy. No live AI, oracle, wallet or order submission.
// Prices are known only up to the current crossing; no future extrema are read.
export const LIFECYCLE_RULES=Object.freeze({
  version:'valuation-lifecycle-v1',buy:[58,75],restart:75,secondExit:[130,160],
  protectedInitialCapital:.20,restartCoreShare:.60
});

export function runLifecycle(o,api){
  const {inventory,valuation,CASES,BASE,CAPITAL,allocationPlan,pathKnots,priceAt}=api;
  const value=(q,p)=>q.stock*p+q.cash;
  const seed=(budget,p,range,phase)=>{const unit=inventory(1,p,...range);return {L:budget/value(unit,p),range:[...range],phase};};
  const held=(s,p)=>inventory(s.L,p,...s.range);
  const startPrice=o.startPrice,days=o.years*365,knots=pathKnots(o),eventDay=reviewDay(o.eventYear);
  const core=seed(CAPITAL*.389545,startPrice,BASE.core,'core');
  const active=seed(CAPITAL*.2,startPrice,BASE.sell,'sell');
  const wallet={stock:CAPITAL*.372095/startPrice,cash:CAPITAL*.03836};
  const reserve=wallet.cash,tailShares=CAPITAL*LIFECYCLE_RULES.protectedInitialCapital/startPrice;
  const initialCore=structuredClone(core),initialActive=structuredClone(active),initialWallet={...wallet};
  const total=p=>{const a=held(core,p),b=held(active,p);return {stock:wallet.stock+a.stock+b.stock,cash:wallet.cash+a.cash+b.cash};};
  const initial=total(startPrice),events=[],points=[];
  let rule=BASE,valuationCase='unchanged',policy='initial',reviewed=false,reentry=o.cycles;
  let activeStage=1,cycle=1,reviewSnapshot=null,revisionSnapshot=null;
  const feeLedger={core:{earned:0,cash:0,reinvested:0},active:{earned:0,cash:0,reinvested:0}};
  const feeStats=Object.fromEntries(['core','sell','buy'].map(k=>[k,{days:0,capitalDays:0,earned:0}]));
  const feeSum=key=>feeLedger.core[key]+feeLedger.active[key];
  const rateFor=(role,s)=>role==='active'?o.activeApr:s.phase==='accumulate'?o.buyApr:o.coreApr;
  const sleeves=p=>[value(held(core,p),p),value(held(active,p),p),wallet.stock*p,wallet.cash];
  function withdraw(s,p,phase){const q=held(s,p);wallet.stock+=q.stock;wallet.cash+=q.cash;s.L=0;s.phase=phase;}
  function deploy(s,p,range,phase,stockBudget,cashBudget){
    const unit=inventory(1,p,...range),limits=[];
    if(unit.stock>1e-12)limits.push(Math.max(0,Math.min(wallet.stock,stockBudget))/unit.stock);
    if(unit.cash>1e-12)limits.push(Math.max(0,Math.min(wallet.cash,cashBudget))/unit.cash);
    const L=Math.max(0,Math.min(...limits)),used=inventory(L,p,...range);
    s.L=L;s.range=[...range];s.phase=L>1e-10?phase:'waiting';
    wallet.stock=Math.max(0,wallet.stock-used.stock);wallet.cash=Math.max(0,wallet.cash-used.cash);
    return L>1e-10;
  }
  function event(day,p,type,action,text,textEn){
    const before=total(p),beforePrincipal=value(before,p),beforeFeeCash=feeSum('cash'),beforeSleeves=sleeves(p);
    action();const after=total(p),afterPrincipal=value(after,p),afterFeeCash=feeSum('cash');
    const e={day,price:p,type,text,textEn,cycle,activeStage,stock:after.stock,cash:after.cash+afterFeeCash,
      beforeStock:before.stock,beforeCash:before.cash+beforeFeeCash,
      beforeNav:beforePrincipal+beforeFeeCash,afterNav:afterPrincipal+afterFeeCash,
      beforePrincipal,afterPrincipal,beforeSleeves,afterSleeves:sleeves(p),beforeFeeCash,afterFeeCash,
      stockDelta:after.stock-before.stock,cashDelta:after.cash+afterFeeCash-before.cash-beforeFeeCash};
    events.push(e);return e;
  }
  const freeStock=()=>Math.max(0,wallet.stock-tailShares);
  const freeCash=()=>Math.max(0,wallet.cash-reserve);
  function pointAt(day,p){
    const q=total(p),principal=value(q,p),hold=value(initial,p);
    const a=held(initialCore,p),b=held(initialActive,p);
    const fixed=(initialWallet.stock+a.stock+b.stock)*p+initialWallet.cash+a.cash+b.cash;
    const fees=feeSum('earned'),feeCash=feeSum('cash'),reinvestedFees=feeSum('reinvested');
    const positions=Object.fromEntries([['core',core],['active',active]].map(([role,s])=>{
      const q=held(s,p),inRange=s.L>0&&p>s.range[0]&&p<s.range[1];
      return [role,{...q,value:value(q,p),liquidity:s.L,range:[...s.range],phase:s.phase,inRange,
        apr:rateFor(role,s),stage:role==='active'?activeStage:null}];
    }));
    const feeRunRates=Object.fromEntries(Object.entries(positions).map(([role,s])=>[role,s.inRange?s.value*s.apr/100:0]));
    const annualFeeRunRate=feeRunRates.core+feeRunRates.active;
    return {day,price:p,stock:q.stock,cash:q.cash+feeCash,fees,feeCash,reinvestedFees,
      feeLedger:structuredClone(feeLedger),feeStats:structuredClone(feeStats),feeRunRates,annualFeeRunRate,
      feeAnnualContributionPct:annualFeeRunRate/(principal+feeCash)*100,feeContributionPct:fees/CAPITAL*100,
      roiPct:((principal+feeCash)/CAPITAL-1)*100,principal,nav:principal+feeCash,pure:CAPITAL*p/startPrice,usdc:CAPITAL,
      hold,holdingPnl:hold-CAPITAL,il:fixed-hold,management:principal-fixed-reinvestedFees,
      phase:active.phase,corePhase:core.phase,valuationCase,reentry,policy,reviewed,cycle,activeStage,
      sleeves:sleeves(p),coreRange:[...core.range],activeRange:[...active.range],coreLiquidity:core.L,activeLiquidity:active.L,
      positions,free:{stock:wallet.stock,cash:wallet.cash,feeCash},protectedTailShares:tailShares,
      lastAction:events.at(-1)??null};
  }
  function compoundFees(day,p){
    for(const [role,s] of [['core',core],['active',active]]){
      const account=feeLedger[role],amount=account.cash;
      if(amount<=1e-10||s.L<=0||p<=s.range[0]||p>=s.range[1])continue;
      const e=event(day,p,'reinvest',()=>{
        s.L+=amount/value(inventory(1,p,...s.range),p);account.cash=0;account.reinvested+=amount;
      },'年度手续费复投：按当时股币比例追加至对应的有效 LP','Annual fee reinvestment: add to the corresponding in-range LP at the current asset ratio');
      Object.assign(e,{feeRole:role,reinvestedUsd:amount});
    }
  }
  function transition(day,p,up){
    const near=(a,b)=>Math.abs(a-b)<1e-7;
    // Completed exits go to the wallet, never remain falsely labelled as an LP.
    if(active.L>0&&up&&near(p,active.range[1]))event(day,p,'sell',()=>{
      withdraw(active,p,'cash');activeStage++;
    },'Active 本段兑现完成：关闭 LP，现金进入钱包等待','Active exit completed: close the LP and retain its cash in the wallet');
    if(core.L>0&&core.phase==='core'&&up&&near(p,core.range[1]))event(day,p,'core-sell',()=>{
      withdraw(core,p,'cash');
    },'Core 到达上沿：关闭 LP，保留现金，不在高位重新买入','Core upper boundary reached: close, retain cash, and do not buy back at the high');
    if(core.L>0&&core.phase==='accumulate'&&!up&&near(p,core.range[0]))event(day,p,'buy',()=>{
      withdraw(core,p,'stock');if(active.L>0)withdraw(active,p,'armed');else active.phase='armed';activeStage=1;cycle++;
    },'Core 积累完成：关闭 LP，将所得股票留在钱包等待回升','Core accumulation completed: close the LP and hold the acquired shares for a recovery');
    else if(core.L>0&&core.phase==='core'&&!up&&near(p,core.range[0])&&(!reentry||policy!=='initial'))event(day,p,'core-hold',()=>{
      withdraw(core,p,'stock');
    },'Core 跌至下沿：关闭并持股等待，不追着价格下移','Core lower boundary reached: close and hold shares; do not chase the price lower');

    if(policy==='initial'&&!up&&near(p,LIFECYCLE_RULES.buy[0])&&(core.L>0||active.L>0))event(day,p,'hold',()=>{
      withdraw(core,p,'stock');withdraw(active,p,reentry?'armed':'paused');activeStage=1;
    },'到达低位持股条件：关闭剩余 LP，股票与现金在钱包等待','Low-price holding condition reached: close remaining LPs and wait with wallet shares and cash');
    if(policy!=='initial'||!reentry)return;
    if(!up&&near(p,LIFECYCLE_RULES.buy[1])&&core.phase!=='accumulate'){
      event(day,p,'buy-open',()=>{
        withdraw(core,p,'stock');if(active.L>0)withdraw(active,p,'armed');else active.phase='armed';
        activeStage=1;
        deploy(core,p,LIFECYCLE_RULES.buy,'accumulate',0,freeCash());
        if(core.L===0)core.phase='stock';
      },'回落至 $75：保留已有股票，用储备之外的可用现金开启 Core 积累段 $58–75','Pullback to $75: retain shares and fund the $58–75 Core accumulation range with available cash above the reserve');
    }
    if(up&&near(p,LIFECYCLE_RULES.restart)&&core.phase!=='core'&&freeStock()>1e-9){
      event(day,p,'core-open',()=>{
        withdraw(core,p,'stock');
        deploy(core,p,[LIFECYCLE_RULES.restart,BASE.core[1]],'core',freeStock()*LIFECYCLE_RULES.restartCoreShare,0);
      },'回升至 $75：用可部署股票的 60% 重启 Core $75–172.95；现金继续保留','Recovery to $75: restart Core at $75–172.95 with 60% of deployable shares; retain cash');
    }
    const band=activeStage===1?BASE.sell:activeStage===2?LIFECYCLE_RULES.secondExit:null;
    if(band&&active.L===0&&up&&near(p,band[0])&&freeStock()>1e-9){
      const stage=activeStage;
      event(day,p,'sell-open',()=>{
        deploy(active,p,band,'sell',freeStock()*(stage===1?.5:1),0);
      },stage===1?'回升至 $90：用可部署股票的一半开启第一段 Active $90–115':'上涨至 $130：仅用剩余可部署股票开启第二段 Active $130–160，不动已兑现现金',
      stage===1?'Recovery to $90: deploy half the available shares in Active stage 1, $90–115':'Rise to $130: deploy remaining eligible shares in Active stage 2, $130–160; leave realized cash untouched');
    }
  }
  if(startPrice<=BASE.core[0]){withdraw(core,startPrice,'stock');withdraw(active,startPrice,'armed');}
  else if(startPrice>=BASE.core[1]){withdraw(core,startPrice,'cash');withdraw(active,startPrice,'cash');activeStage=3;}
  points.push(pointAt(0,startPrice));
  for(let day=1;day<=days;day++){
    const p0=priceAt(knots,day-1),p1=priceAt(knots,day),up=p1>p0;
    const bounds=[...core.range,...active.range,...LIFECYCLE_RULES.buy,LIFECYCLE_RULES.restart,...BASE.sell,...LIFECYCLE_RULES.secondExit,BASE.core[1]];
    const cuts=[0,1,...bounds.filter(p=>p>Math.min(p0,p1)+1e-10&&p<Math.max(p0,p1)-1e-10).map(p=>(p-p0)/(p1-p0))].sort((a,b)=>a-b);
    const unique=[...new Set(cuts)];if(p0!==p1)transition(day-1,p0,up);
    for(let j=1;j<unique.length;j++){
      const t0=unique[j-1],t1=unique[j],pm=p0+(p1-p0)*(t0+t1)/2,p=p0+(p1-p0)*t1;
      for(const [role,s] of [['core',core],['active',active]])if(s.L>0&&pm>s.range[0]&&pm<s.range[1]){
        const capital=value(held(s,pm),pm),dt=t1-t0,earned=capital*rateFor(role,s)/100*dt/365;
        feeLedger[role].earned+=earned;feeLedger[role].cash+=earned;
        const bucket=feeStats[role==='active'?'sell':s.phase==='accumulate'?'buy':'core'];
        bucket.days+=dt;bucket.capitalDays+=capital*dt;bucket.earned+=earned;
      }
      if(p0!==p1)transition(day-1+t1,p,up);
    }
    if(day===eventDay)reviewSnapshot=pointAt(day,p1);
    if(day===eventDay&&o.revision!=='unchanged'){
      rule=CASES[o.revision];valuationCase=o.revision;
      event(day,p1,'revision',()=>{
        const principal=value(total(p1),p1);withdraw(core,p1,'stock');withdraw(active,p1,'paused');
        if(o.allocation==='inventory'){
          const [c,a,s,cash]=allocationPlan(o.revision,p1).weights;
          Object.assign(core,seed(principal*c,p1,rule.core,c>0?'core':'paused'));
          Object.assign(active,seed(principal*a,p1,rule.sell,a>0?'sell':'paused'));
          const stockBudget=o.revision==='pressure'?Math.min(principal*s,wallet.stock*p1):principal*s;
          wallet.stock=stockBudget/p1;wallet.cash=principal*(1-c-a)-stockBudget;
          policy=o.revision==='improve'?'growth':'defensive';
        }else{
          deploy(core,p1,rule.core,'core',wallet.stock,wallet.cash);
          deploy(active,p1,rule.sell,'sell',wallet.stock,wallet.cash);
          policy='range-review';
        }
        reentry=false;
      },o.allocation==='inventory'?'估值修正：关闭旧仓，按当时价格模拟换仓；费用留现单独保留':'估值修正：仅用已有股币配对迁移 LP，配不齐的资产留在钱包',
      o.allocation==='inventory'?'Valuation revision: close old positions and rebalance at the current simulated price; retained fees stay separate':'Valuation revision: pair existing assets into revised ranges; unmatched assets remain in the wallet');
    }
    if(o.revision==='pressure'&&o.allocation==='inventory'&&o.recovery&&day===eventDay+365)event(day,p1,'review',()=>{reviewed=true;},'假设经营企稳已核实：继续等待进入新中性区间','Assumed stabilization verified: still wait for entry into the revised Base range');
    const n=valuation('pressure');
    if(reviewed&&policy==='defensive'&&p1>=n[1].value&&p1<=n[2].value)event(day,p1,'rebuild',()=>{
      const principal=value(total(p1),p1);Object.assign(core,seed(principal*.2,p1,rule.core,'core'));
      wallet.stock=principal*.1/p1;wallet.cash=principal*.7;policy='rebuilding';
    },'企稳与新中性估值满足：按当时价格重建 20% Core，10% 持股，70% 现金','Stabilization and revised Base valuation confirmed: rebalance to 20% Core, 10% shares and 70% cash at the current price');
    if(day===eventDay)revisionSnapshot=pointAt(day,p1);
    if(o.reinvest&&day%365===0)compoundFees(day,p1);
    points.push(pointAt(day,p1));
  }
  return {model:LIFECYCLE_RULES.version,options:o,points,events,knots,initial,eventDay,reviewSnapshot,revisionSnapshot,final:points.at(-1)};
}
