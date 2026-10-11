// Raydium market observations are deliberately independent of the investment simulator.
export const RWA_SOURCE='https://raydium.io/liquidity-pools/?type=RWA';
export const USDC_MINT='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const POOL_SELECTION=Object.freeze([
  {symbol:'CRCLx',mint:'XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1',id:'G39wywquKbHK8F2wZZZFX3fcsyG91VCCbbr6WEVp5axy',selection:'existing-project-pool'},
  {symbol:'NVDAx',mint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',id:'49iMatQtoyabsYAQc8GafVq6aeBFVDxSRH44oiatyyw6',selection:'highest-tvl-usdc-at-selection'},
  {symbol:'TSLAx',mint:'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',id:'8aDaBQkTrS6HVMjyc6EZebgdiaXhLYGriDWKWWp1NpFF',selection:'highest-tvl-usdc-at-selection'},
  {symbol:'AAPLx',mint:'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',id:'CKwJZwm7oj3nu4653N1EpDrqXbXAYXoPFiPeEnLouF8y',selection:'highest-tvl-usdc-at-selection'},
  {symbol:'SPYx',mint:'XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W',id:'6truu3rZuiB9rKQg4VYC3Dt3QwV7DgwGqXrYUcrvnDDE',selection:'highest-tvl-usdc-at-selection'},
  {symbol:'QQQx',mint:'Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ',id:'GMjGLWzvK75LPetrgAmdeXnvxc4fUuQPwJxeQqTDU1aG',selection:'highest-tvl-usdc-at-selection'}
]);
export const POOLS_API='https://api-v3.raydium.io/pools/info/ids?ids='+POOL_SELECTION.map(p=>p.id).join(',');
const metric=(value,name)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error('Invalid '+name);return value;};
export function normalizePools(payload,fetchedAt){
  if(payload?.success!==true||!Array.isArray(payload.data)||!Number.isFinite(Date.parse(fetchedAt)))throw new Error('Invalid Raydium response');
  const pools=POOL_SELECTION.map(expected=>{
    const matches=payload.data.filter(p=>p?.id===expected.id);
    if(matches.length!==1)throw new Error('Missing or duplicate pool: '+expected.symbol);
    const p=matches[0],mints=[p.mintA?.address,p.mintB?.address];
    if(p.type!=='Concentrated'||!mints.includes(expected.mint)||!mints.includes(USDC_MINT))throw new Error('Unexpected pool pair: '+expected.symbol);
    const monthly=p.month?.feeApr;
    return {...expected,feeApr30d:typeof monthly==='number'&&Number.isFinite(monthly)&&monthly>=0?monthly:null,apr30dFetchedAt:fetchedAt,apr30dSnapshot:false,tvlUsd:metric(p.tvl,'TVL'),feeApr24h:metric(p.day?.feeApr,'fee APR'),
      fees24hUsd:metric(p.day?.volumeFee,'24h fees'),volume24hUsd:metric(p.day?.volume,'24h volume'),
      feeRate:metric(p.feeRate,'fee rate'),type:p.type};
  });
  return {fetchedAt,pools,totalTvlUsd:pools.reduce((s,p)=>s+p.tvlUsd,0),
    totalFees24hUsd:pools.reduce((s,p)=>s+p.fees24hUsd,0)};
}
export function withAprFallback(next,previous){
  return {...next,pools:next.pools.map(p=>{
    const prior=previous?.pools.find(old=>old.id===p.id&&old.mint===p.mint);
    return p.feeApr30d==null&&prior?.feeApr30d!=null?{...p,feeApr30d:prior.feeApr30d,apr30dFetchedAt:prior.apr30dFetchedAt,apr30dSnapshot:true}:p;
  })};
}
export function compactUsd(value){
  if(value==null||!Number.isFinite(value))return '—';
  if(value>=1e9)return '$'+(value/1e9).toFixed(2)+'B';
  if(value>=1e6)return '$'+(value/1e6).toFixed(2)+'M';
  if(value>=1e3)return '$'+(value/1e3).toFixed(2)+'K';
  return '$'+value.toFixed(2);
}
async function readJson(url,fetcher,timeoutMs){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{const r=await fetcher(url,{signal:controller.signal,credentials:'omit'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json();}
  finally{clearTimeout(timeout);}
}
export function createMarketFeed({fetcher=globalThis.fetch,now=()=>new Date().toISOString(),onChange=()=>{},timeoutMs=6000}={}){
  const state={data:null,mode:'loading',refreshing:false,error:false};
  const notify=()=>onChange(state);
  async function refresh(){
    if(state.refreshing)return;
    state.refreshing=true;state.error=false;notify();
    try{
      const payload=await readJson(POOLS_API,fetcher,timeoutMs);
      const next=withAprFallback(normalizePools(payload,now()),state.data);
      state.data=next;state.mode='fetched';
    }catch{state.error=true;if(!state.data)state.mode='unavailable';}
    finally{state.refreshing=false;notify();}
  }
  async function start(){
    try{
      const snapshot=await readJson('data/rwa-pools.snapshot.json',fetcher,timeoutMs);
      if(snapshot.schemaVersion!==1)throw new Error('Unsupported snapshot');
      state.data=normalizePools(snapshot.response,snapshot.fetchedAt);state.data.pools.forEach(p=>{p.apr30dSnapshot=true;});state.mode='snapshot';notify();
    }catch{state.mode='unavailable';notify();}
    await refresh();
  }
  return {state,start,refresh};
}
