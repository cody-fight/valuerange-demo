import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizePools,withAprFallback,createMarketFeed,POOL_SELECTION,POOLS_API,compactUsd} from '../dist/market-pools.mjs';
const snapshot=JSON.parse(await readFile(new URL('../dist/data/rwa-pools.snapshot.json',import.meta.url),'utf8'));
const response=value=>({ok:true,json:async()=>structuredClone(value)});
test('selected pools use fee APR and sum only the selected pool observations',()=>{
 const raw=structuredClone(snapshot.response);raw.data[0].day.apr=999;
 const result=normalizePools(raw,snapshot.fetchedAt);
 assert.equal(result.pools.length,6);
 assert.equal(result.pools[0].feeApr24h,raw.data.find(p=>p.id===POOL_SELECTION[0].id).day.feeApr);
 assert.equal(result.totalTvlUsd,result.pools.reduce((sum,p)=>sum+p.tvlUsd,0));
 assert.equal(compactUsd(null),'—');assert.equal(compactUsd(0),'$0.00');
});
test('reject missing pools, mismatched mints and invalid numbers atomically',()=>{
 for(const change of [r=>r.data.pop(),r=>r.data.push(r.data[0]),r=>r.data[0].mintA.address='wrong',r=>r.data[0].day.feeApr=null]){
  const raw=structuredClone(snapshot.response);change(raw);assert.throws(()=>normalizePools(raw,snapshot.fetchedAt));
 }
});
test('failed network uses timestamped snapshot; successful refresh replaces it; later failure retains it',async()=>{
 let fail=true;const calls=[];
 const feed=createMarketFeed({now:()=> '2026-10-11T04:00:00.000Z',fetcher:async(url,options)=>{
  calls.push(url);assert.equal(options.credentials,'omit');
  if(url!==POOLS_API)return response(snapshot);
  if(fail)throw new Error('offline');return response(snapshot.response);
 }});
 await feed.start();assert.equal(feed.state.mode,'snapshot');assert.equal(feed.state.error,true);assert.equal(feed.state.data.fetchedAt,snapshot.fetchedAt);
 fail=false;await feed.refresh();assert.equal(feed.state.mode,'fetched');assert.equal(feed.state.data.fetchedAt,'2026-10-11T04:00:00.000Z');
 const prior=feed.state.data;fail=true;await feed.refresh();assert.equal(feed.state.data,prior);assert.equal(feed.state.error,true);assert.equal(calls.length,4);
});
test('concurrent refresh is deduplicated and total failure remains unavailable',async()=>{
 let resolve;let calls=0;
 const feed=createMarketFeed({fetcher:()=>{calls++;return new Promise(r=>resolve=r);}});
 const pending=feed.refresh();await feed.refresh();assert.equal(calls,1);resolve(response(snapshot.response));await pending;assert.equal(feed.state.mode,'fetched');
 const offline=createMarketFeed({fetcher:async()=>{throw Error('offline');}});await offline.start();assert.equal(offline.state.mode,'unavailable');assert.equal(offline.state.data,null);
});

test('30-day APR uses monthly fees, retains only matching pool snapshots, and preserves real zero',()=>{
 const prior=normalizePools(snapshot.response,snapshot.fetchedAt);
 for(const p of prior.pools)assert.equal(p.feeApr30d,snapshot.response.data.find(raw=>raw.id===p.id).month.feeApr);
 const raw=structuredClone(snapshot.response);delete raw.data[0].month;raw.data[1].month.feeApr=0;
 const next=normalizePools(raw,'2026-10-12T00:00:00Z');
 const missing=next.pools.find(p=>p.id===raw.data[0].id);assert.equal(missing.feeApr30d,null);
 const restored=withAprFallback(next,prior).pools.find(p=>p.id===missing.id);
 assert.equal(restored.feeApr30d,prior.pools.find(p=>p.id===missing.id).feeApr30d);assert.equal(restored.apr30dSnapshot,true);assert.equal(restored.apr30dFetchedAt,snapshot.fetchedAt);
 assert.equal(withAprFallback(next,null).pools.find(p=>p.id===missing.id).feeApr30d,null);
 assert.equal(withAprFallback(next,prior).pools.find(p=>p.id===raw.data[1].id).feeApr30d,0);
 const mismatch={...prior,pools:prior.pools.map(p=>({...p,mint:'different'}))};assert.equal(withAprFallback(next,mismatch).pools.find(p=>p.id===missing.id).feeApr30d,null);
});
test('live response missing monthly APR uses the saved month timestamp while daily metrics refresh',async()=>{
 const raw=structuredClone(snapshot.response);const id=raw.data[0].id;delete raw.data[0].month;raw.data[0].tvl=100;
 const feed=createMarketFeed({fetcher:async url=>response(url===POOLS_API?raw:snapshot)});await feed.start();
 const p=feed.state.data.pools.find(p=>p.id===id);assert.equal(p.tvlUsd,100);assert.equal(p.apr30dSnapshot,true);assert.equal(p.apr30dFetchedAt,snapshot.fetchedAt);assert.notEqual(p.feeApr30d,null);
});
