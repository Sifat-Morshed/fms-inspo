import puppeteer from 'puppeteer';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const target = new URL(process.argv[2] || 'https://cuberto.com');
if (!['http:', 'https:'].includes(target.protocol)) throw new Error('HTTP(S) required');
const out = path.resolve(process.argv[3] || 'capture');
await mkdir(path.join(out,'assets'),{recursive:true});
const browser = await puppeteer.launch({headless:true});
const jobs = new Set(), manifest = [], issues = [];
try {
 const page = await browser.newPage();
 await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
 await page.setRequestInterception(true);
 page.on('request',req=>{
  const host = new URL(req.url()).hostname;
  if (/(^|\.)(google-analytics\.com|googletagmanager\.com|doubleclick\.net|hotjar\.com|clarity\.ms)$/.test(host)) req.abort();
  else req.continue();
 });
 page.on('pageerror',e=>issues.push(String(e)));
 page.on('response',response=>{
  const job=(async()=>{
   const url=response.url(); const type=response.request().resourceType();
   if(!['script','stylesheet','image','font','media','other'].includes(type)||!response.ok())return;
   try {
    const body=await response.buffer();
    const ext=path.extname(new URL(url).pathname).replace(/[^.a-z0-9]/gi,'').slice(0,12);
    const name=createHash('sha256').update(url).digest('hex')+ext;
    await writeFile(path.join(out,'assets',name),body);
    manifest.push({url,file:`assets/${name}`,type,status:response.status(),headers:response.headers(),bytes:body.length});
   }catch(e){issues.push({url,error:String(e)});}
  })();jobs.add(job);job.finally(()=>jobs.delete(job));
 });
 await page.goto(target.href,{waitUntil:'domcontentloaded',timeout:60000});
 // networkidle0 means zero connections for >=500ms; streaming can prevent it.
 try {await page.waitForNetworkIdle({idleTime:500,concurrency:0,timeout:30000});}
 catch {issues.push('Initial strict idle timed out; bounded capture continued');}
 await page.evaluate(()=>document.fonts.ready);
 let previous=0,stable=0;
 for(let step=0;step<160;step++){
  const state=await page.evaluate(()=>({y:scrollY,h:innerHeight,total:document.documentElement.scrollHeight}));
  await page.evaluate(()=>scrollBy(0,innerHeight*.75));
  await new Promise(r=>setTimeout(r,150));
  if(state.y+state.h>=state.total-2){stable=state.total===previous?stable+1:0;previous=state.total;if(stable>=3)break;}
 }
 await page.evaluate(()=>scrollTo(0,0));
 try {await page.waitForNetworkIdle({idleTime:1000,concurrency:0,timeout:20000});}catch{issues.push('Final strict idle timed out');}
 await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const computed=await page.evaluate(()=>[...document.querySelectorAll('*')].map((el,id)=>{
  const s=getComputedStyle(el),r=el.getBoundingClientRect();
  const values=Object.fromEntries([...s].map(k=>[k,s.getPropertyValue(k)]));
  const pseudo=p=>{const c=getComputedStyle(el,p);return Object.fromEntries([...c].map(k=>[k,c.getPropertyValue(k)]));};
  return {id,tag:el.tagName,htmlId:el.id,class:el.getAttribute('class'),rect:{x:r.x,y:r.y,width:r.width,height:r.height},style:values,before:pseudo('::before'),after:pseudo('::after')};
 }));
 const cdp=await page.createCDPSession();
 const snapshot=await cdp.send('DOMSnapshot.captureSnapshot',{computedStyles:['display','grid-template-columns','font-family','font-size','transform'],includeDOMRects:true,includePaintOrder:true});
 await writeFile(path.join(out,'painted.html'),await page.content());
 await writeFile(path.join(out,'computed.json'),JSON.stringify(computed));
 await writeFile(path.join(out,'dom-snapshot.json'),JSON.stringify(snapshot));
 await page.screenshot({path:path.join(out,'full-page.png'),fullPage:true});
 await Promise.allSettled([...jobs]);
 await writeFile(path.join(out,'manifest.json'),JSON.stringify({target:target.href,viewport:page.viewport(),capturedAt:new Date().toISOString(),assets:manifest,issues},null,2));
 console.log(`Saved ${manifest.length} response bodies to ${out}; ${issues.length} issues. URLs remain in painted.html; use manifest for deliberate URL rewriting.`);
} finally {await browser.close();}
