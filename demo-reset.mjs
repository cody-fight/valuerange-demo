import {journeyStart,beginReview} from './experiment.mjs';
import {conceptDefaults} from './future-preview.mjs';

// Startup and reset share a single, fresh set of defaults; no prior inputs leak in.
export function demoDefaults(latestResearchDate=null){
  const state={...journeyStart(),view:'overview'};
  return {state,draft:beginReview(state),
    flowUi:{comparisonDay:null,started:false,detail:null,detailDraft:false,documentMarkup:'',readingFrom:'library',readingScroll:0},
    proofUi:{key:'map',caseKey:'improve'},researchUi:{date:latestResearchDate},
    introUi:{decision:'low',cycle:0},futureUi:{entry:'investor',step:0,goal:'growth',event:false},conceptUi:conceptDefaults()};
}
export function replaceState(target,source){for(const key of Object.keys(target))delete target[key];Object.assign(target,structuredClone(source));}
