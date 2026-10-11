import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const src=path.resolve(root,'../../dist');
const frozen=path.join(root,'frozen');fs.mkdirSync(frozen,{recursive:true});
const manifest={};
function copyModule(name){
 if(manifest[name])return;
 const content=fs.readFileSync(path.join(src,name));
 manifest[name]=crypto.createHash('sha256').update(content).digest('hex');
 fs.mkdirSync(path.dirname(path.join(frozen,name)),{recursive:true});fs.writeFileSync(path.join(frozen,name),content);
 for(const m of content.toString().matchAll(/(?:from\s*|import\s*)['"]\.\/([^'"]+)['"]/g))copyModule(m[1]);
}
copyModule('long-term.mjs');copyModule('scenario-context.mjs');
const {simulate,DEFAULTS}=await import(pathToFileURL(path.join(frozen,'long-term.mjs')));
const {eventScenario}=await import(pathToFileURL(path.join(frozen,'scenario-context.mjs')));
const input={...DEFAULTS,startPrice:92.02,priceModel:'daily-v1',shape:'cycles2',years:5,end:133,eventYear:4,revision:'improve'};
const market=eventScenario(input),revised=simulate(market),fixed=simulate({...market,revision:'unchanged'}),original=simulate({...input,revision:'unchanged'});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
for(const r of [revised,fixed,original]){
 for(const p of r.points){near(p.nav,p.stock*p.price+p.cash);near(p.nav-10000,p.holdingPnl+p.il+p.management+p.fees);near(p.fees,p.reinvestedFees+p.feeCash);}
 for(const e of r.events)near(e.beforeNav,e.afterNav);
}
for(let i=0;i<revised.points.length;i++){
 near(revised.points[i].price,fixed.points[i].price);
 if(i<=revised.eventDay){near(revised.points[i].price,original.points[i].price);near(revised.points[i].nav,fixed.points[i].nav);}
}
near(revised.final.price,251);near(revised.points[0].price,92.02);
const expected=[66882.53211449835,41541.15812134967,27276.67898282982,3988.7600534349795];
[revised.final.nav,fixed.final.nav,revised.final.pure,revised.final.fees].forEach((v,i)=>near(v,expected[i]));
const point=p=>Object.fromEntries(['day','price','nav','pure','fees','stock','cash','phase','sleeves','coreRange'].map(k=>[k,p[k]]));
const report={input,marketEnd:market.end,eventDay:revised.eventDay,manifest,checks:['Common comparator prices','Exact preserved pre-event history','NAV and event conservation','Fee attribution','Approved results matched'],final:{revised:revised.final.nav,fixed:fixed.final.nav,hold:revised.final.pure,fees:revised.final.fees,excess:revised.final.nav-revised.final.pure,delta:revised.final.nav-fixed.final.nav},before:revised.reviewSnapshot,after:revised.revisionSnapshot,points:revised.points.map((p,i)=>({...point(p),fixed:fixed.points[i].nav})),original:original.points.map(point),events:revised.events};
fs.writeFileSync(path.join(root,'scenario.json'),JSON.stringify(report));
console.log(JSON.stringify({final:report.final,checks:report.checks},null,2));
