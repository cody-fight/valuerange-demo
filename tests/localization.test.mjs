import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {configureLocale,getLanguage,resolveLanguage,translate,messageTemplate} from '../dist/locales/locale.mjs';
import {simulate} from '../dist/long-term.mjs';
import {storyDefaults} from '../dist/experiment.mjs';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const catalog=JSON.parse(await read('dist/locales/en.json'));
const sha=s=>createHash('sha256').update(s).digest('hex');

test('English messages retain numeric slots and signed financial values',()=>{
  for(const [source,target] of Object.entries(catalog))assert.deepEqual(source.match(/\{\d+\}/g)?.sort()??[],target.match(/\{\d+\}/g)?.sort()??[],source);
  configureLocale(catalog,'en');
  assert.equal(translate('  1 年 1 个月 · 累计 ROI -12.3%  '),'  1 year 1 month · Cumulative ROI -12.3%  ');
  assert.equal(translate('净买入 12.3456 CRCLx；现金变化 −$1,234.56'),'Net purchase: 12.3456 CRCLx; cash change −$1,234.56');
  assert.equal(translate('本金 $30,512.65 · −0.24%'),'Principal $30,512.65 · −0.24%');
  assert.equal(translate('Core LP [79.72,328.13]'),'Core LP [79.72,328.13]');
  assert.equal(translate('未知的新消息'),'未知的新消息');
});

test('language selection has no effect on simulation or given candidate numbers',()=>{
  for(const revision of ['unchanged','improve','pressure']){
    const settings={...storyDefaults(revision),coreApr:12.5,activeApr:31.2,buyApr:9.5,reinvest:false};
    configureLocale(catalog,'zh');const original=simulate(settings);
    configureLocale(catalog,'en');assert.deepEqual(simulate(settings),original);
    configureLocale(catalog,'zh');assert.equal(translate('期末股价'),'期末股价');
  }
});

test('all English excerpts match their source version and translated Markdown hash',async()=>{
  const bundle=JSON.parse(await read('dist/data/en/documents.json'));
  const manifest=JSON.parse(await read('docs/localization/manifest.json'));
  const originals=(await Promise.all(['documents','research-trail'].map(async f=>JSON.parse(await read('dist/data/'+f+'.json')).documents))).flat();
  assert.equal(Object.keys(bundle.documents).length,originals.length);
  for(const source of originals){
    const translated=bundle.documents[source.id],record=manifest.records.find(r=>r.id===source.id);
    assert.equal(translated.originalExcerptSha256,source.excerptSha256);
    assert.equal(record.sourceSha256,source.sourceSha256);
    assert.equal(sha(translated.markdown),translated.translationSha256);
    assert.equal(await read(record.file),translated.markdown);
    assert.ok(!/[\u3400-\u9fff]/.test(translated.markdown));
    // Every decimal, money and percentage table value stays identical (headers excluded).
    if(['valuation_inputs','pnl_latest','monitor','bridge','research-20260914','research-20260915'].includes(source.id)){
      const rows=s=>s.split(/\r?\n/).filter(l=>l.startsWith('|')&&/\d/.test(l)).map(l=>l.split('|').map(cell=>(cell.match(/[-+]?\d+(?:,\d{3})*(?:\.\d+)?/g)??[]).sort()));
      assert.deepEqual(rows(translated.markdown),rows(source.markdown),source.id+' table values');
    }
  }
});

test('translated AI business records preserve all non-text values and original hashes',async()=>{
  for(const name of ['ai-evidence','workflow-evidence','ai-input-improve','ai-input-pressure']){
    const original=JSON.parse(await read('dist/data/'+name+'.json'));
    const translated=JSON.parse(await read('dist/data/en/'+name+'.json'));
    const walk=(a,b,path='')=>{
      if(a&&typeof a==='object'){for(const [k,v] of Object.entries(a))walk(v,b[k],path+'/'+k);}
      else if(typeof a!=='string'||!/[\u3400-\u9fff]/.test(a))assert.deepEqual(b,a,path);
      else assert.ok(!/[\u3400-\u9fff]/.test(b),path);
    };
    walk(original,translated);
    assert.equal(translated._translation.originalFileSha256,sha(await readFile(new URL('dist/data/'+name+'.json',root))));
  }
});

test('every collected UI template has an English translation',async()=>{
  const source=JSON.parse(await read('docs/localization/ui-source.json'));
  configureLocale(catalog,'en');
  for(const example of Object.values(source))assert.ok(!/[\u3400-\u9fff]/.test(translate(example)),messageTemplate(example).key);
});


test('unqualified entry URLs default to English; Chinese requires an explicit selection',()=>{
 for(const value of [undefined,null,'','en','EN','invalid'])assert.equal(resolveLanguage(value),'en');
 assert.equal(resolveLanguage('zh'),'zh');
 configureLocale(catalog,'zh');assert.equal(getLanguage(),'zh');
 configureLocale(catalog);assert.equal(getLanguage(),'en');
 configureLocale(catalog,'invalid');assert.equal(getLanguage(),'en');
});
