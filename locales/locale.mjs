// Offline presentation translation. Numbers, state and calculation inputs stay untouched.
let language='en', messages={};
// Only an explicit Chinese selection overrides the English entry default.
export const resolveLanguage=lang=>lang==='zh'?'zh':'en';
export const getLanguage=()=>language;
export function configureLocale(catalog,lang){messages=catalog;language=resolveLanguage(lang);}
export function setLanguage(lang){language=resolveLanguage(lang);}
export function messageTemplate(value){const values=[];const key=value.trim().replace(/\d[\d,]*(?:\.\d+)?/g,n=>`{${values.push(n)-1}}`);return {key,values};}
export function translate(value){
  if(language!=='en'||!/[\u3400-\u9fff]/u.test(value))return value;
  const {key,values}=messageTemplate(value),template=messages[key];
  if(template===undefined)return value;
  const leading=value.match(/^\s*/)[0],trailing=value.match(/\s*$/)[0];
  return leading+template.replace(/\{(\d+)\}/g,(_,i)=>values[Number(i)]??`{${i}}`).replace(/\b1 years\b/g,'1 year').replace(/\b1 months\b/g,'1 month').replace(/\b1 times\b/g,'1 time')+trailing;
}
export function localizeMarkup(html){
  if(language!=='en')return html;
  const template=document.createElement('template');template.innerHTML=html;
  const walker=document.createTreeWalker(template.content,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    if(!walker.currentNode.parentElement?.closest('script,style'))walker.currentNode.data=translate(walker.currentNode.data);
  }
  for(const el of template.content.querySelectorAll('*'))for(const name of ['aria-label','title','placeholder','alt','content']){
    if(el.hasAttribute(name))el.setAttribute(name,translate(el.getAttribute(name)));
  }
  return template.innerHTML;
}
