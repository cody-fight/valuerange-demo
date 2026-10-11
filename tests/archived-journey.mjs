// Frozen v0.28 walkthrough inputs. Keep historical monetary regression cases
// independent of the current UI defaults and its new daily-price model.
import {storyDefaults,experimentDefaults} from '../dist/experiment.mjs';
export function journeyStart(current=experimentDefaults()){
  return {...storyDefaults('unchanged',current),startPrice:92.02,years:5,shape:'cycles3',end:85,eventYear:4,reinvest:current.reinvest,day:1825};
}
