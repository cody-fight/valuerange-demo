// Archived evidence is text, never executable HTML. Keep its lists and tables
// readable without changing source records or their verification hashes.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function markdown(text){
  let out='',fence=false,code=[],table=[],list=null;
  const inline=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');
  const closeList=()=>{if(list){out+='</'+list+'>';list=null;}};
  const flushTable=()=>{
    if(!table.length)return;
    const rows=table.filter(x=>!/^\|[\s:|\-]+\|$/.test(x));
    out+='<div class="table-wrap"><table>'+rows.map((r,i)=>'<tr>'+r.replace(/^\||\|$/g,'').split('|').map(v=>`<${i?'td':'th'}>${inline(v.trim())}</${i?'td':'th'}>`).join('')+'</tr>').join('')+'</table></div>';
    table=[];
  };
  for(const line of text.split(/\r?\n/)){
    if(line.startsWith('```')){flushTable();closeList();if(fence){out+='<pre>'+esc(code.join('\n'))+'</pre>';code=[];}fence=!fence;continue;}
    if(fence){code.push(line);continue;}
    if(line.startsWith('|')){closeList();table.push(line);continue;}
    flushTable();
    const item=line.match(/^\s*(?:([-*])|\d+\.)\s+(.*)/);
    if(item){const kind=item[1]?'ul':'ol';if(list!==kind){closeList();list=kind;out+='<'+kind+'>'; }out+='<li>'+inline(item[2])+'</li>';continue;}
    closeList();
    const heading=line.match(/^(#{1,6})\s+(.*)/);
    if(heading){const level=Math.min(6,heading[1].length+1);out+=`<h${level}>${inline(heading[2])}</h${level}>`;}
    else if(line.trim())out+='<p>'+inline(line.replace(/^>\s?/,''))+'</p>';
  }
  flushTable();closeList();if(fence)out+='<pre>'+esc(code.join('\n'))+'</pre>';
  return out;
}
