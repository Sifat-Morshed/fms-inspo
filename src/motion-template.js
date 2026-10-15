import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
// Reconstruction template only: use measured values; do not run alongside native bundles.
export function bindMotion(root, spec) {
 const mm=gsap.matchMedia();
 mm.add('(prefers-reduced-motion: no-preference)',()=>{
  const ctx=gsap.context(()=>{
   for(const item of spec){
    const trigger=root.querySelector(item.trigger);
    const target=root.querySelector(item.target);
    if(!trigger||!target)throw new Error(`Unmatched selector: ${item.target}`);
    gsap.fromTo(target,item.from,{...item.to,scrollTrigger:{trigger,start:item.start,end:item.end,scrub:item.scrub,pin:item.pin,invalidateOnRefresh:true}});
   }
  },root);
  document.fonts.ready.then(()=>ScrollTrigger.refresh());
  return ()=>ctx.revert();
 });
 return ()=>mm.revert();
}
