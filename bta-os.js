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

// Non-home pages skip the cold boot: the machine is already up and the visitor
// is already known, so they run this condensed handshake instead - a few checks,
// an identity confirmation, and ACCESS GRANTED. Eleven lines at the same cadence
// as the full boot, with a shorter logo and fade, lands the whole overlay at ~2s.
const grantedLines=[
 ["BTA-3000 BIOS v.3000.7","accent"],["BENEATH THE ALTER SYSTEMS","ok"],["",""],
 ["MEMORY CHECK ............ OK","ok"],["AUDIO CORE .............. OK","ok"],["NETWORK INTERFACE ....... OK","ok"],["",""],
 ["SECURE CHANNEL ...... ESTABLISHED","ok"],["IDENTITY CONFIRMED","accent"],["",""],
 ["ACCESS GRANTED","accent"]
];

function boot(){
 const root=document.createElement("div");
 root.className="bta-boot";
 root.innerHTML='<div class="bta-boot__frame"><div class="bta-boot__head"><span>BTA-3000 // BIOS</span><span>SECURE BOOT</span></div><div class="bta-boot__screen" aria-live="polite"></div><div class="bta-boot__progress"><div class="bta-boot__bar"></div></div><div class="bta-boot__status"><span>SYSTEM INITIALIZATION</span><span class="bta-pct">0%</span></div><button class="bta-boot__skip">SKIP INITIALIZATION</button></div><div class="bta-boot__logo"><strong>BENEATH<br>THE ALTER</strong><small>SYSTEM STATUS: ONLINE // YEAR 3000</small></div>';
 document.body.prepend(root);
 const screen=root.querySelector(".bta-boot__screen"),bar=root.querySelector(".bta-boot__bar"),pct=root.querySelector(".bta-pct");
 let finished=false;
 // The homepage is the cold boot: twenty-seven lines, ~3.9s, the works. Every
 // other page runs the condensed ACCESS GRANTED handshake above for ~2s, because
 // nothing is being initialised on a navigation. Both paths replay on every load
 // - refresh, nav click, back button - with no "seen it before" flag. logoMs and
 // fadeS are handed to CSS so the overlay is always removed just after its own
 // animation actually ends. Reduced motion runs the overlay without streaming.
 const file=(location.pathname.split("/").pop()||"").toLowerCase();
 const home=file===""||file==="index.html"||file==="index.htm";
 const logoMs=reduce?60:(home?700:450);
 const fadeS=reduce?.2:(home?.55:.30);
 root.style.setProperty("--bta-fade",fadeS+"s");
 // Reduced motion and the short handshake both cannot spare the full 900ms logo
 // reveal, so they get a compressed one that is allowed to finish rather than
 // being clipped mid-blur.
 if(reduce||!home)root.classList.add("fast");
 // Initializing is the wrong word when nothing is being initialized.
 if(!reduce&&!home)root.querySelector(".bta-boot__status span").textContent="ACCESS CHECK";
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
 const seq=home?bootLines:grantedLines;
 const lead=home?180:120;
 const tail=home?380:280;
 const cadence=()=>home?40+Math.random()*50:50+Math.random()*30;
 let i=0;
 const tick=()=>{if(finished)return;if(i<seq.length){const [txt,kind]=seq[i++];addLine(txt,kind)}
 const p=Math.min(99,Math.round(i/seq.length*100));bar.style.width=p+"%";pct.textContent=p+"%";
 if(i<seq.length)setTimeout(tick,cadence());else{bar.style.width="100%";pct.textContent="100%";setTimeout(finish,tail)}};
 setTimeout(tick,lead);
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
 // The greeting streams line by line like a boot log. The two blank lines are a
 // non-breaking space rather than an empty string: an empty div collapses to zero
 // height and would eat the gap between the blocks.
 const greeting=["> CONNECTING TO AUDIO_CORE","> ESTABLISHING SECURE CONNECTION","> LOADING VISUAL MODULE","> DECRYPTING INTERFACE","> RENDER ENGINE ONLINE","> SIGNAL LOCKED","\u00a0","X7@A9#F2<>1K9...","QW7!2KALP0$9...","93JDKA7@!L2...","\u00a0","> MODULE READY"];
 const open=(from)=>{if(term.classList.contains("open"))return;opener=from||document.activeElement;term.classList.add("open");input.focus();if(!greeted){greeted=true;greeting.forEach((line,i)=>{if(reduce)write(line);else setTimeout(()=>write(line),i*90)})}};
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
 // Two reveal tracks. Elements tagged data-terminal-reveal play the full
 // terminal -> element transition (boot, then a glitch pass); everything else
 // keeps the plain decode fade. The class is only ever attached here, so if this
 // script never runs the section keeps its normal opacity instead of being
 // stranded at opacity:0 by CSS nothing told it about.
 const reveal=el=>{if(el.dataset.btaRevealed)return;el.dataset.btaRevealed="1";
  if(!el.classList.contains("bta-terminal-reveal")){el.classList.add("bta-visible");return}
  el.classList.add("bta-decoding");
  // btaGlitchFlash replaces btaElementBoot with no fill mode, so the landed state
  // is pinned first. Both animation classes are then dropped together: removing
  // only bta-glitch would hand the animation property back to bta-decoding and
  // replay the boot from the start.
  setTimeout(()=>el.classList.add("bta-decoded","bta-glitch"),860);
  setTimeout(()=>el.classList.remove("bta-decoding","bta-glitch"),1300)};
 const targets=[...document.querySelectorAll("main section,main .page-intro,main .archive-note,main .member-card")];
 if(!("IntersectionObserver" in window)||reduce){targets.forEach(reveal)}
 else{const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){reveal(e.target);io.unobserve(e.target)}}),{threshold:0,rootMargin:"0px 0px -6% 0px"});
 targets.forEach(el=>{el.classList.add(el.hasAttribute("data-terminal-reveal")?"bta-terminal-reveal":"bta-decode");io.observe(el)});
 setTimeout(()=>targets.forEach(el=>{const r=el.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)reveal(el)}),1200);
 addEventListener("load",()=>setTimeout(()=>targets.forEach(el=>{const r=el.getBoundingClientRect();if(r.top<innerHeight*1.2&&r.bottom>0)reveal(el)}),400),{once:true});
 // Same reasoning as the two timeouts above, but running for as long as the page
 // lives: those only sample a single moment each, so an element IntersectionObserver
 // ever misses would sit at opacity:0 forever. Animation must never cost us
 // content. reveal() is idempotent and this only fires for elements already on
 // screen, so the visible effect is unchanged.
 const inView=()=>{targets.forEach(el=>{if(el.dataset.btaRevealed)return;const r=el.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)reveal(el)});
  // Retire the net only once every target has landed. A fixed timeout would be a
  // guess about how long the reader lingers, and a page they open and leave
  // alone for a minute still has to reveal its below-fold content when they come
  // back to it.
  if(targets.every(el=>el.dataset.btaRevealed)){removeEventListener("scroll",onMove);removeEventListener("resize",onMove)}};
 let pending=false;
 const onMove=()=>{if(pending)return;pending=true;setTimeout(()=>{pending=false;inView()},120)};
 addEventListener("scroll",onMove,{passive:true});
 addEventListener("resize",onMove,{passive:true});
 inView()}
 let clicks=0;const status=document.querySelector(".system-strip");if(status)status.addEventListener("click",()=>{if(++clicks>=5){open(status);clicks=0}});
 const clock=document.querySelector(".bta-clock");
 const tickClock=()=>{if(clock)clock.textContent=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})};
 tickClock();setInterval(tickClock,1000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{enhance();boot()});else{enhance();boot()}
})();
