import React, { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { routes } from './route-loaders.js';
const pathname=location.pathname.endsWith('/')?location.pathname:`${location.pathname}/`;
const capture=await (routes[location.pathname]||routes[pathname]||routes['/'])();
for(const html of [...capture.styles,...(capture.inlineStyles||[])])document.head.insertAdjacentHTML('beforeend',html);
function App(){
 useLayoutEffect(()=>{
  let cancelled=false;
  async function boot(){
   for(const src of capture.modules.filter(src=>!src.includes('ClientRouter'))){
    await new Promise(resolve=>{
     const el=document.createElement('script');el.type='module';el.src=src;
     el.onload=resolve;el.onerror=()=>{console.error('Native module failed:',src);resolve();};
     document.body.append(el);
    });
   }
   await document.fonts.ready;
   if(!cancelled)document.dispatchEvent(new Event('astro:page-load'));
  }
  boot();
  const route=e=>{
   const a=e.target.closest('a');if(!a)return;
   const url=new URL(a.href,location.href);
   const key=url.pathname.endsWith('/')?url.pathname:`${url.pathname}/`;
   if(url.origin===location.origin&&!routes[url.pathname]&&!routes[key]&&!url.hash&&!/\.[a-z0-9]+$/i.test(url.pathname))a.href=`https://cuberto.com${url.pathname}${url.search}${url.hash}`;
  };
  document.addEventListener('click',route,true);
  return()=>{cancelled=true;document.removeEventListener('click',route,true);};
 },[]);
 return <div style={{display:'contents'}} dangerouslySetInnerHTML={{__html:capture.shell}}/>;
}
flushSync(()=>createRoot(document.getElementById('root')).render(<App/>));
