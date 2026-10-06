(()=>{"use strict";
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const bootLines=[
["BTA-3000 BIOS v.3000.7","accent"],["BENEATH THE ALTER SYSTEMS","ok"],
["MEMORY CHECK ............ OK","ok"],["AUDIO CORE .............. OK","ok"],
["VISUAL CORE ............. OK","ok"],["NETWORK INTERFACE ....... OK","ok"],
["NEURAL ENGINE ........... OK","ok"],["DISTORTION ENGINE ....... OK","ok"],["",""],
["HARDWARE INITIALIZATION","accent"],["CPU ................. ONLINE","ok"],["GPU ................. ONLINE","ok"],
["RAM ................. 128 TB","ok"],["AUDIO PROCESSOR ..... ONLINE","ok"],["NEURAL LINK ......... CONNECTED","ok"],
["SIGNAL PROCESSOR .... ONLINE","ok"],["",""],["SECURITY CHECK","accent"],["ENCRYPTION .......... ACTIVE","ok"],
["FIREWALL ............ ACTIVE","ok"],["SIGNAL .............. SEARCHING","ok"],["",""],
["UNKNOWN SIGNAL DETECTED","warn"],["SIGNAL IDENTIFIED","accent"],["SOURCE: BENEATH_THE_ALTER","ok"],["",""],["LOADING BTA-OS","accent"]
];

function boot(){
 const root=document.createElement("div");
 root.className="bta-boot";
 root.innerHTML='<div class="bta-boot__frame"><div class="bta-boot__head"><span>BTA-3000 // BIOS</span><span>SECURE BOOT</span></div><div class="bta-boot__screen" aria-live="polite"></div><div class="bta-boot__progress"><div class="bta-boot__bar"></div></div><div class="bta-boot__status"><span>SYSTEM INITIALIZATION</span><span class="bta-pct">0%</span></div><button class="bta-boot__skip">SKIP INITIALIZATION</button></div><div class="bta-boot__logo"><strong>BENEATH<br>THE ALTER</strong><small>SYSTEM STATUS: ONLINE // YEAR 3000</small></div>';
 document.body.prepend(root);
 const screen=root.querySelector(".bta-boot__screen"),bar=root.querySelector(".bta-boot__bar"),pct=root.querySelector(".bta-pct");
 let finished=false;
 // Every load replays the whole sequence - refresh, a nav click, a back
 // button - so there is deliberately no "seen it before" shortcut. logoMs and
 // fadeS are handed to CSS so the overlay is always removed just after its own
 // animation actually ends. Reduced motion runs the same overlay minus the
 // streaming: three summary lines instead of twenty-seven.
 const logoMs=reduce?60:700;
 const fadeS=reduce?.2:.55;
 root.style.setProperty("--bta-fade",fadeS+"s");
 // The reduced-motion panel cannot spare the full 900ms logo reveal, so it gets
 // a compressed one that finishes instead of being cut off mid-blur.
 if(reduce)root.classList.add("fast");
 // One place that renders a BIOS line, so both paths share markup and class names.
 const addLine=(txt,kind)=>{const el=document.createElement("div");el.className="bta-boot__line "+(kind||"");el.textContent="> "+txt;screen.append(el);screen.scrollTop=screen.scrollHeight;return el};
 const finish=()=>{if(finished)return;finished=true;root.classList.add("logo-phase");setTimeout(()=>{root.classList.add("is-done");setTimeout(()=>root.remove(),Math.round(fadeS*1000)+40)},logoMs)};
 root.querySelector(".bta-boot__skip").onclick=finish;
 // Hard failsafe: whatever happens below, the overlay is gone within 15s so the
 // site underneath is always reachable.
 setTimeout(()=>root.remove(),15000);
 if(reduce){
  // Reduced motion still boots, it just does not stream. Show the header, the
  // system name and SYSTEM READY, then reveal with no scrolling required.
  addLine("BTA-3000 BIOS v.3000.7","accent");
  addLine("BENEATH THE ALTER SYSTEMS","ok");
  addLine("SYSTEM READY","accent");
  bar.style.width="100%";pct.textContent="100%";setTimeout(finish,40);return;
 }
 let i=0;
 const tick=()=>{if(finished)return;if(i<bootLines.length){const [txt,kind]=bootLines[i++];addLine(txt,kind)}
 const p=Math.min(99,Math.round(i/bootLines.length*100));bar.style.width=p+"%";pct.textContent=p+"%";
 if(i<bootLines.length)setTimeout(tick,40+Math.random()*50);else{bar.style.width="100%";pct.textContent="100%";setTimeout(finish,380)}};
 setTimeout(tick,180);
}
function enhance(){
 document.body.classList.add("bta-os");
 const hud=document.createElement("div");hud.className="bta-hud";hud.innerHTML='<i class="bta-hud__corner tl"></i><i class="bta-hud__corner tr"></i><i class="bta-hud__corner bl"></i><i class="bta-hud__corner br"></i>';document.body.append(hud);
 // Reduced motion gets no sweep line at all: the CSS keyframes are disabled
 // there, which would otherwise strand a fixed 1px line at an arbitrary spot.
 if(!reduce){const scan=document.createElement("div");scan.className="bta-scan";document.body.append(scan)}
 // Spec 13 puts this readout in the desktop top bar, not floating over the page:
 // inside .system-strip it can never sit on top of footer content or a control.
 const sys=document.createElement("div");sys.className="bta-system";sys.innerHTML='<span><span class="live" aria-hidden="true"></span><strong>BTA-OS // ONLINE</strong></span><span>NODE: NYC-001</span><span>SIGNAL: <strong>98%</strong></span><span>YEAR: 3000 // <span class="bta-clock"></span></span>';sys.setAttribute("aria-hidden","true");
 const strip=document.querySelector(".system-strip");
 if(strip){strip.insertBefore(sys,strip.querySelector(".strip-right")||null)}else{document.body.append(sys)}
 const term=document.createElement("div");term.className="bta-terminal";term.innerHTML='<div class="bta-terminal__bar"><span>BTA://TERMINAL</span><button class="bta-terminal__close">CLOSE ×</button></div><div class="bta-terminal__body"></div><input class="bta-terminal__input" aria-label="Terminal input" autocomplete="off" placeholder="type ALTER or BTA3000...">';document.body.append(term);
 const body=term.querySelector(".bta-terminal__body"),input=term.querySelector(".bta-terminal__input");
 // Everything the terminal prints is built with textContent so no string, typed
 // or echoed, is ever parsed as markup.
 const write=(text,cls)=>{const line=document.createElement("div");if(cls)line.className=cls;line.textContent=text;body.append(line);body.scrollTop=body.scrollHeight};
 let opener=null,greeted=false;
 const open=(from)=>{if(term.classList.contains("open"))return;opener=from||document.activeElement;term.classList.add("open");input.focus();if(!greeted){greeted=true;write("> connection established");write("> band database online");write("> audio core online");write("> archive synchronized")}};
 const close=()=>{if(!term.classList.contains("open"))return;term.classList.remove("open");if(opener&&typeof opener.focus==="function")opener.focus({preventScroll:true});opener=null};
 term.querySelector(".bta-terminal__close").onclick=close;
 input.onkeydown=e=>{if(e.key==="Escape"){close();return}if(e.key!=="Enter")return;const v=input.value.trim().toUpperCase();input.value="";if(!v)return;write("> "+v);if(v==="ALTER"){write("> ROOT NODE RECOGNIZED","bta-echo-ok");write("> ACCESS: BENEATH THE ALTER","bta-echo-ok")}if(v==="BTA3000")write("> YOU HAVE REACHED THE DEEPEST NODE.","bta-echo-cyan")};
 const editable=e=>{const t=e.target;return t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"||t.tagName==="SELECT"||t.isContentEditable)};
 let keys="";document.addEventListener("keydown",e=>{if(e.key==="Escape"){close();return}if(e.metaKey||e.ctrlKey||e.altKey||editable(e))return;if(e.key&&e.key.length===1){keys=(keys+e.key.toUpperCase()).slice(-12);if(keys.endsWith("ALTER")||keys.endsWith("BTA3000"))open(e.target)}});
 document.querySelectorAll(".site-header nav a").forEach((a,i)=>{const tag=document.createElement("span");tag.className="bta-nav-tag";tag.setAttribute("aria-hidden","true");tag.textContent="MODULE_"+String(i+1).padStart(2,"0")+" // ONLINE";a.append(tag)});
 // Fine pointers only, and never under reduced motion: the JS decides this
 // rather than leaving it to CSS, so no listener is attached needlessly.
 if(!reduce&&!matchMedia("(hover:none)").matches){const cursor=document.createElement("div");cursor.className="bta-target";document.body.append(cursor);document.addEventListener("pointermove",e=>{cursor.style.left=e.clientX+"px";cursor.style.top=e.clientY+"px"},{passive:true});document.querySelectorAll("a,button").forEach(el=>{el.addEventListener("mouseenter",()=>cursor.classList.add("active"));el.addEventListener("mouseleave",()=>cursor.classList.remove("active"))})}
 // Reveal-on-scroll. A threshold of 0.12 would strand any element taller than
 // roughly eight viewports (the homepage feed on a phone) at opacity:0 forever,
 // because that much of it can never be on screen at once. A 0 threshold plus a
 // small bottom inset fires reliably for every height, and anything left hidden
 // is forced visible below so animation can never cost us the content.
 const reveal=el=>{el.classList.add("bta-visible")};
 const targets=[...document.querySelectorAll("main section,main .page-intro,main .archive-note,main .member-card")];
 if(!("IntersectionObserver" in window)||reduce){targets.forEach(reveal)}
 else{const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){reveal(e.target);io.unobserve(e.target)}}),{threshold:0,rootMargin:"0px 0px -6% 0px"});
 targets.forEach(el=>{el.classList.add("bta-decode");io.observe(el)});
 setTimeout(()=>targets.forEach(el=>{const r=el.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)reveal(el)}),1200);
 addEventListener("load",()=>setTimeout(()=>targets.forEach(el=>{const r=el.getBoundingClientRect();if(r.top<innerHeight*1.2&&r.bottom>0)reveal(el)}),400),{once:true})}
 let clicks=0;const status=document.querySelector(".system-strip");if(status)status.addEventListener("click",()=>{if(++clicks>=5){open(status);clicks=0}});
 const clock=document.querySelector(".bta-clock");
 const tickClock=()=>{if(clock)clock.textContent=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})};
 tickClock();setInterval(tickClock,1000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{enhance();boot()});else{enhance();boot()}
})();
