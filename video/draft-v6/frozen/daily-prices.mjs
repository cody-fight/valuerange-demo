// Deterministic market noise, independent of allocation, fees and UI state.
// Each anchor interval has a bounded bridge that returns exactly to zero.
export function dailyBridge(anchors,noiseEnabled=true){
  const out=[{...anchors[0]}];
  for(let i=1;i<anchors.length;i++){
    const a=anchors[i-1],b=anchors[i],length=b.day-a.day;
    let seed=(0x6d2b79f5 ^ a.day ^ (b.day<<12))>>>0;
    const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  // Independent, irregular horizons produce clustered volatility, pauses and
  // counter-trend moves. Rescale periods for short scenarios, not the returns.
  const scale=Math.min(1,length/180);
  const band=(min,max)=>{
   const values=[(random()-.5)*2];let start=0,previous=values[0];
   while(start<length){
    const span=Math.max(3,Math.round((min+random()*(max-min))*scale));
    const next=(random()-.5)*2;
    for(let j=1;j<=span&&start+j<=length;j++){
     const u=j/span,s=u*u*(3-2*u);
     values.push(previous+(next-previous)*s);
    }
    start+=span;previous=next;
   }
   return values;
  };
  // Vary trend speed without changing the major turning points. Quiet periods
  // alternate with fast repricing; a linear monthly drift is not a market path.
  const regime=band(20,70),impulse=band(6,18),progress=[0];
  for(let j=1;j<=length;j++)progress.push(progress[j-1]+Math.exp(1.9*regime[j]+.65*impulse[j]));
  const slow=band(35,95),swing=band(12,42),volatility=band(18,65),noise=[];let z=0,momentum=0;
  for(let j=0;j<=length;j++){
   // Persistent returns, rather than independent price-level jitter, allow
   // directional candles, one-sided shadows and quiet stretches. Volatility
   // clusters over time; OHLC is still aggregated from these exact prices.
   const sigma=.02*Math.exp(1.5*volatility[j]);
   momentum=.48*momentum+(random()-.5)*sigma;
   z=.975*z+momentum;
   noise.push(.045*slow[j]+.055*swing[j]+z);
  }
    for(let j=1;j<=length;j++){
   const u=j/length,base=a.price+(b.price-a.price)*progress[j]/progress[length];
   // A smooth bound avoids flat clipped tops; the bridge pins every anchor.
   const residual=noise[j]-(1-u)*noise[0]-u*noise[length];
   const bridge=.08*Math.tanh(residual/.09);
   out.push({day:a.day+j,price:j===length?b.price:Math.max(1,Math.min(400,base*(1+(noiseEnabled?bridge:0))))});
    }
  }
  return out;
}

export function candleBuckets(prices,count=60){
  const days=prices.length-1,n=Math.min(count,days);
  return Array.from({length:n},(_,i)=>{
    const from=Math.floor(i*days/n),to=Math.floor((i+1)*days/n);
    const values=prices.slice(from,to+1).map(p=>p.price);
    return {from,to,open:values[0],close:values.at(-1),high:Math.max(...values),low:Math.min(...values)};
  });
}
