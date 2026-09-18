// Whole-day simulation clock: a one-year case reviews at month six (day 183).
export const HORIZONS=Object.freeze([1,2,3,4,5]);
export const reviewYears=years=>years===1?[.5]:Array.from({length:years-1},(_,i)=>i+1);
export const reviewDay=year=>Math.round(year*365);
export const reviewLabel=(year,language='zh')=>year<1
  ?language==='en'?`Month ${Math.round(year*12)}`:`第 ${Math.round(year*12)} 个月`
  :language==='en'?`End of year ${year}`:`第 ${year} 年末`;
