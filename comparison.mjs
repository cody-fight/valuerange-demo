// Read-only comparison of two already simulated portfolios at the same time.
// Fee income is part of NAV, not an additional return to add on top.
export function comparisonDay(value,lastDay){
  return value==null||!Number.isFinite(Number(value))?lastDay:Math.max(0,Math.min(lastDay,Math.round(Number(value))));
}
const clean=value=>Math.abs(value)<1e-7?0:value;
export function comparisonAt(revised,baseline,day){
  day=comparisonDay(day,Math.min(revised.final.day,baseline.final.day));
  const point=revised.points[day],original=baseline.points[day];
  const totalDelta=clean(point.nav-original.nav),feeDelta=clean(point.fees-original.fees);
  const positionDelta=clean(totalDelta-feeDelta);
  // Allocate cent rounding to the residual so the displayed equation reconciles.
  // Full-precision values above are retained for calculations and inspection.
  const cents=v=>Math.sign(v)*Math.round(Math.abs(v)*100),totalCents=cents(totalDelta),feeCents=cents(feeDelta);
  return {day,point,original,totalDelta,feeDelta,positionDelta,
    display:{totalDelta:totalCents/100,feeDelta:feeCents/100,positionDelta:(totalCents-feeCents)/100},
    phase:revised.options.revision==='unchanged'?'unchanged':day<revised.eventDay?'before':day===revised.eventDay?'review':'after'};
}
