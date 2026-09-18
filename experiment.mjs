import {reviewDay,reviewYears} from './timeline.mjs';
import {DEFAULTS,validate} from './long-term.mjs';
import {DEMO_REFERENCE} from './demo-reference.mjs';

export const PATH_ENDS=Object.freeze({growthStory:170,cycles3:85,pressureStory:30,bull:280,decline:40,cycles2:100,stableStory:100});

export const FEE_KEYS=['coreApr','activeApr','buyApr'];
export const FEE_PROFILES={cautious:{label:'审慎默认',coreApr:14,activeApr:37.3,buyApr:14},observed:{label:'观察水平',coreApr:28,activeApr:74.6,buyApr:14},low:{label:'低费用',coreApr:7,activeApr:18.7,buyApr:7}};
export const feePatch=o=>Object.fromEntries(FEE_KEYS.map(k=>[k,o[k]]));
export const feeLabel=o=>'Core '+o.coreApr+'% / Active 退出 '+o.activeApr+'% / Core 积累 '+o.buyApr+'%';
export function experimentDefaults() {return {...validate(DEFAULTS),day:DEFAULTS.years*365};}
export function updateExperiment(current,patch) {
  const next={...current,...patch};
  // Choosing a new whole-horizon path explicitly replaces the example path.
  // A business-thesis or review-date change alone never rewrites market prices.
  if(['shape','years','startPrice'].some(k=>patch[k]!==undefined&&patch[k]!==current[k])&&patch.marketPath===undefined)next.marketPath=null;
  if(patch.shape!==undefined&&patch.marketPath===undefined)next.marketPath=null;
  if(FEE_KEYS.some(k=>patch[k]!==undefined)&&patch.apr===undefined)delete next.apr;
  if(patch.apr!==undefined)Object.assign(next,{coreApr:patch.apr,activeApr:patch.apr,buyApr:patch.apr});
  if(patch.years!==undefined){const choices=reviewYears(next.years);next.eventYear=choices.includes(next.eventYear)?next.eventYear:Math.max(choices[0],Math.min(next.eventYear,choices.at(-1)));next.day=next.years*365;}
  if(patch.shape!==undefined){
    if(patch.end===undefined)next.end=PATH_ENDS[patch.shape];
    if(patch.day===undefined)next.day=next.years*365;
  }
  const normalized=validate(next);
  if(!Number.isInteger(next.day)||next.day<0||next.day>next.years*365)throw new Error('Invalid observation day');
  return {...next,...normalized};
}
export function applyProposal(current,draft) {
  const keys=['startPrice','years','shape','end','apr',...FEE_KEYS,'cycles','reinvest','revision','eventYear','allocation','recovery','day','marketPath'];
  return updateExperiment(current,Object.fromEntries(keys.filter(k=>draft[k]!==undefined).map(k=>[k,draft[k]])));
}
export function storyDefaults(revision='improve',fees={}) {
  const shape={improve:'growthStory',pressure:'pressureStory',unchanged:'stableStory'}[revision];
  const rates=typeof fees==='number'?{apr:fees}:Object.fromEntries(['startPrice',...FEE_KEYS].filter(k=>fees[k]!==undefined).map(k=>[k,fees[k]]));
  return {...validate({...DEFAULTS,...rates,revision,shape,end:revision==='improve'?280:revision==='pressure'?24:100}),day:1825};
}

// Review changes the decision, never silently changes the market used to judge it.
export function beginReview(current) {
  return {...validate(current),day:reviewDay(current.eventYear),revision:current.revision};
}
export function chooseDecision(draft,revision) {
  return updateExperiment(draft,{revision,day:reviewDay(draft.eventYear)});
}
// User controls keep duration, target and intervening path independently editable.
// Legacy named presets remain available through updateExperiment for archived fixtures.
export function updateSimulationControls(current,patch){
  return updateExperiment(current,{...(patch.shape!==undefined&&patch.end===undefined?{end:current.end}:{}),...patch});
}
// The guided review is now an immediate edit of the shared simulation.
// Keep the run/comparison observation separate from the review snapshot.
export function reviewSelection(current,patch){
  const state=updateSimulationControls(current,patch);
  return {state,draft:beginReview(state)};
}
export function applyReview(current,draft) {
  const next=applyProposal(current,draft);
  return {...next,day:reviewDay(next.eventYear)};
}
export function journeyStart(current=experimentDefaults()) {
  return {...storyDefaults('unchanged',current),startPrice:DEMO_REFERENCE.close,years:5,shape:'cycles3',end:PATH_ENDS.cycles3,eventYear:4,reinvest:current.reinvest,day:1825};
}
