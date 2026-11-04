/**
 * Official Code transcript pin engine — pin 2.31226.1
 * c7f8992b4-BdURlFSy.js `T` (export `r` → cd5a `Lse`).
 *
 * Hook aliases match that chunk:
 *   e=useLayoutEffect, t=useRef, n=useCallback, r=useMemo,
 *   s=useLatestRef (shared-4 `pw`).
 *
 * `classifyKeyScroll` default is this file's `C` (export `n`).
 * Gat uses ca80 `NZ` for find/toast; local Code has no find overlay —
 * `C` is the pin-file residual. Nested-scroll still skips via `v()`.
 */
// @ts-nocheck
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

const cAttr = "data-rocksteady-sizer";
const l = `[${cAttr}]`;
const u = "data-transcript-not-rows";
const d = "data-transcript-stays-put";
const f = "data-transcript-stays-put-scope";
const p = "data-transcript-elastic-room";
const m = "data-transcript-last-row-controls";
const h = `[${m}]`;
const g = 'input,textarea,select,[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"]';

function _(e) {
  if (e === null || e.nodeType !== 1) return null;
  let t = e;
  return v(t) ? null : t;
}
function v(e) {
  return e.closest(g) !== null;
}
function ee(e) {
  return e === "Enter" || e === " ";
}
function y(e, t, n = e.scrollTop, r = e.scrollHeight - e.clientHeight) {
  return Math.max(n, r - (t?.unfoldedGrowth?.() ?? 0));
}
var te = 150,
  ne = 200,
  re = 500,
  ie = 2500,
  ae = 4,
  oe = 400,
  se = 150,
  ce = 15e3,
  b = 1e3,
  le = 1e3,
  ue = 2,
  de = 16,
  fe = 8,
  pe = 1500,
  me = 0.75,
  x = new WeakMap();
function S(e, t) {
  let n = x.get(e);
  n === undefined ? (e.scrollTop = t) : n(t);
}
var he = new Set(["ArrowUp", "Home"]);
function C(e, t) {
  if ((e.ctrlKey || e.altKey || e.metaKey) && !he.has(e.key)) return "none";
  if (e.key === "Tab") return e.shiftKey ? "up" : "none";
  let n = e.target;
  if (!(n !== null && (n === t.ownerDocument.body || t.contains(n))) || v(n)) return "none";
  switch (e.key) {
    case "ArrowUp":
    case "PageUp":
    case "Home":
      return "up";
    case "ArrowDown":
    case "PageDown":
    case "End":
      return "down";
    case " ":
      return e.shiftKey ? "up" : "down";
    default:
      return "none";
  }
}
var w = "data-transcript-continues-turn";
function ge() {
  return {
    reads: 0,
    pointerReads: 0,
    sameWindow: 0,
    maxMs: 0,
    pointerMaxMs: 0,
    msTotal: 0,
    uncorroboratedUnpins: 0,
    clampRestores: 0,
  };
}
function _e(e, t, n, r) {
  return (
    e.current && t.current !== n && (e.current.disconnect(), (e.current = null)),
    (e.current ||= (t.current = n, r(n))),
    e.current
  );
}

function ownerDefaultView(e) {
  if (!e) return null;
  const doc = e.nodeType === 9 ? e : e.ownerDocument;
  return doc?.defaultView ?? null;
}
function mutationObserverOf(e) {
  return ownerDefaultView(e)?.MutationObserver ?? globalThis.MutationObserver;
}
function resizeObserverOf(e) {
  return ownerDefaultView(e)?.ResizeObserver ?? globalThis.ResizeObserver;
}

function useLatestRef(value) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export const OFFICIAL_PIN_CLASSIFY_KEY_SCROLL = C;
export const OFFICIAL_PIN_SETTLED_BOTTOM = y;

export function useOfficialTranscriptPin(c) {
  const e = useLayoutEffect;
  const t = useRef;
  const n = useCallback;
  const r = useMemo;
  const s = useLatestRef;
  const i = ownerDefaultView;
  const a = mutationObserverOf;
  const o = resizeObserverOf;
  return (function T(c)
{let{initialPinned:l,epochKey:u,getScrollElement:d,adjustmentAtRef:f,classifyKeyScroll:p,engineRef:m,shouldIgnoreWheel:h,onFollowCompensation:g,shouldRepinOnContainerResize:_,keepsFollow:S,resnapBeforeInput:he=!0,hidden:C=!1}=c,w=t(l),T=t(!1),ve=t(!1),ye=t(!1),be=t(new Set),E=t(()=>void 0),xe=t(0),Se=t(0),D=t(null),Ce=t(g),O=t(null),we=t({lastT:0,upTotal:0}),k=t(0),Te=t(1),A=t(0);t(null);let j=t(ge()),Ee=t(new Set),M=t(null),De=t(0),Oe=t(0);t(0);let ke=s(l),N=s(d),P=t(!1),Ae=t(-1/0),F=t(0),I=t(-1/0),L=t(-1/0),R=t(-1/0),z=t(-1/0),B=t(null),je=t(null),Me=t(null),V=t(!1),Ne=t(-1/0),H=t(0),U=t(0),Pe=t(0),Fe=t(!0),W=n(()=>{H.current=0,Pe.current=0,U.current=0,Fe.current=!1},[]),G=t(0),Ie=s(he),Le=s(C),K=t(1/0),q=t(null),Re=t(_),J=t(null),Y=n(e=>{if(!e&&K.current<=2&&(q.current=performance.now()),w.current!==e){w.current=e,J.current=null,e&&(q.current=null),z.current=-1/0,L.current=-1/0,I.current=-1/0;for(let t of Array.from(Ee.current))t(e)}},[]),ze=n(e=>(Ee.current.add(e),()=>{Ee.current.delete(e)}),[]),X=n((e,t)=>{f.current=performance.now(),G.current=0,e.scrollTop=t,M.current=e.scrollTop,m?.current?.setScrollTop(e.scrollTop)},[m,f]),Be=n((e,t)=>{let n=e.scrollTop;k.current=n,J.current!==null&&(J.current=Math.max(0,t)),A.current=0,K.current=y(e,m?.current,n)-n,K.current>2&&(q.current=null)},[m]),Z=n(e=>{if(!w.current||T.current)return!1;let t=d();if(!t)return!1;let n=t.scrollTop,r=y(t,m?.current,n);if(r-n<=2)return!1;X(t,r),De.current=f.current;let i=t.scrollTop;return k.current=i,Ce.current?.(i-n,e,t),i!==n},[d,X,f,m]),Ve=n(()=>{Z(!1)},[Z]),Q=t(Z);e(()=>{Q.current=Z},[Z]);let He=t(p),Ue=t(h),We=t(S);e(()=>{He.current=p,Ue.current=h,Ce.current=g,Re.current=_,We.current=S},[p,h,g,_,S]);let Ge=n(e=>{W();let t=d(),n=Re.current,r=n===void 0?null:t;if(r!==null&&n!==void 0&&!w.current){let t=q.current;(K.current<=2||t!==null&&performance.now()-t<=b)&&e.some(e=>e.target===r)&&n()&&Y(!0)}let i=t&&e.find(e=>e.target===t);if(t&&i){let e=B.current,n=i.contentRect.width;(e===null||e.box!==n)&&(e!==null&&(z.current=performance.now()),B.current={box:n,client:t.clientWidth,spent:null})}if(Q.current(!0),r!==null){let e=r.scrollTop;K.current=y(r,m?.current,e)-e}},[d,Y,W,m]),Ke=t(Ge);e(()=>{Ke.current=Ge},[Ge]);let qe=t(null),Je=n(e=>_e(D,qe,o(e),t=>{let n=new t(e=>Ke.current(e)),r=O.current;return r&&r!==e&&n.observe(r),n}),[]),Ye=t(null),Xe=n(e=>_e(je,Ye,a(e),e=>new e(()=>{let e=performance.now();e-R.current<se||(z.current=e)})),[]),Ze=n(e=>{if(!Ie.current||!w.current||T.current)return;let t=performance.now();if(t-U.current>=de&&(H.current=0,Pe.current=0),H.current>=ue||!V.current&&t-Ne.current>le||t-I.current<re||t<G.current)return;let n=N.current();if(!n||n.ownerDocument.hidden)return;if(e!==null){let t=!0;for(let n of e){let e=n.target,r=e.nodeType===1?e:e.parentElement;if(r===null||!v(r)){t=!1;break}}if(t)return}let r=j.current;r.reads+=1,H.current>0&&(r.sameWindow+=1),H.current+=1,H.current===1&&(U.current=t);let a=k.current-n.scrollTop<=1&&Q.current(!1),o=performance.now()-t;r.msTotal+=o,o>r.maxMs&&(r.maxMs=o),Pe.current+=o;let s=Pe.current>=fe;s&&(H.current=ue),(s||a)&&(U.current=1/0,a||i(n)?.requestAnimationFrame(()=>{U.current===1/0&&W()})),e===null&&(r.pointerReads+=1,o>r.pointerMaxMs&&(r.pointerMaxMs=o))},[N,Ie,W]),Qe=t(Ze);e(()=>{Qe.current=Ze},[Ze]);let $e=t(null),et=n(e=>_e(Me,$e,a(e),e=>new e(e=>{Fe.current=!0,Qe.current(e)})),[]),tt=n(e=>{let t=d();if(!t)return;let n=t.scrollTop,r=t.scrollHeight-t.clientHeight,a=y(t,m?.current,n,r)-n,o=k.current,s=n<o,c=i(t)?.devicePixelRatio??1,l=c!==Te.current;Te.current=c,K.current=a,a<=2&&(G.current=0),s&&a>2&&(q.current=null),n!==o&&(A.current=n>o?1:-1),k.current=n;let u=performance.now(),p=we.current,h=p.upTotal>0&&u-p.lastT<ne,g=T.current||h,_=e&&u-f.current<=te,v=e&&n===M.current;J.current!==null&&n!==o&&(n>o||n<r-1?J.current+=n-o:(v||_)&&(J.current=null)),e&&(W(),M.current=null,T.current&&!v&&!_&&(ve.current=!0));let ee=P.current&&u-Ae.current<ce,ae=u-I.current<re,se=w.current,b=()=>{u-R.current>=te&&(j.current.clampRestores+=1),R.current=u,Q.current(!1)};(()=>{if(!g&&!_&&!v&&A.current>0&&a<=1){Y(!0);return}if(!se||!s||a<=2)return;let e=g||ee||ae||u-L.current<ie;if(_&&!e){b();return}if(e){Y(!1);return}if(l&&(o-n)*c<me){b();return}let r=z.current,i=Le.current?null:B.current,d=i===null?null:t.clientWidth;if(u-r<oe&&r>R.current||i!==null&&d!==i.client&&d!==i.spent){i!==null&&(i.spent=d),b();return}j.current.uncorroboratedUnpins+=1,Y(!1)})()},[d,f,Y,W,Le,m]),nt=t(()=>void 0),rt=t(null),it=n(e=>{if(rt.current===e||(nt.current(),rt.current=e,B.current=null,K.current=1/0,q.current=null,J.current=null,!e))return;k.current=e.scrollTop,Te.current=i(e)?.devicePixelRatio??1,F.current=e.scrollTop,M.current=null;let t=()=>tt(!0);V.current=i(e)?.matchMedia?.("(any-hover: hover)").matches===!0&&e.matches(":hover"),Fe.current=!0;let n=e=>{e.pointerType==="touch"||V.current||(V.current=!0,Fe.current&&Qe.current(null))},r=e=>{e.pointerType!=="touch"&&(V.current=!1)},a=()=>{Ne.current=performance.now()},o=t=>{if(t.ctrlKey||Math.abs(t.deltaY)<=Math.abs(t.deltaX)||Ue.current?.(t))return;let n=performance.now(),r=we.current;t.deltaY<0?(r.upTotal=n-r.lastT>ne?-t.deltaY:r.upTotal+-t.deltaY,r.lastT=n,z.current=-1/0,w.current&&e.scrollTop>0&&Y(!1),q.current=null):(r.upTotal=0,r.lastT=0,z.current=-1/0)},s=be.current,c=e=>{let t=e.changedTouches[0]?.clientY;t!==void 0&&Math.abs(t-Se.current)>ae&&(ye.current=!0)},l=t=>{for(let e of Array.from(t.changedTouches))s.delete(e.identifier);if(t.touches.length===0&&s.clear(),s.size>0||!T.current)return;T.current=!1,E.current();let n=e.scrollTop,r=y(e,m?.current,n)-n>2;n<F.current&&r&&(L.current=performance.now()),e.scrollTop!==F.current&&(q.current=null),(ve.current||e.scrollTop!==F.current&&(ye.current||f.current===xe.current))&&tt(!1),Q.current(!1)},u=t=>{let n=new Set(Array.from(t.touches,e=>e.identifier));for(let e of Array.from(s))n.has(e)||s.delete(e);for(let e of Array.from(t.changedTouches))s.add(e.identifier);if(!T.current){F.current=e.scrollTop,xe.current=f.current,Se.current=t.changedTouches[0]?.clientY??0,ve.current=!1,ye.current=!1,E.current();let n=t.target;n&&n!==e&&(n.addEventListener("touchmove",c,{passive:!0}),n.addEventListener("touchend",l,{passive:!0}),n.addEventListener("touchcancel",l,{passive:!0}),E.current=()=>{n.removeEventListener("touchmove",c),n.removeEventListener("touchend",l),n.removeEventListener("touchcancel",l),E.current=()=>void 0})}T.current=!0,L.current=-1/0,z.current=-1/0},d=t=>{if(t.button!==0)return;t.target===e&&(q.current=null);let n=i(e),r=t.target;for(;n&&r&&r!==e&&r.nodeType===1;){let e=n.getComputedStyle(r);if(r.scrollHeight>r.clientHeight&&(e.overflowY==="auto"||e.overflowY==="scroll")||r.scrollWidth>r.clientWidth&&(e.overflowX==="auto"||e.overflowX==="scroll"))return;r=r.parentElement}P.current=!0,Ae.current=performance.now(),z.current=-1/0},p=e.ownerDocument,h=p.defaultView,g=()=>{P.current=!1},_=t=>{if(!w.current){let n=q.current;n!==null&&Re.current!==void 0&&(performance.now()-n>b||He.current(t,e)==="up")&&(q.current=null);return}let n=He.current(t,e);n==="down"?z.current=-1/0:n==="up"&&(I.current=performance.now(),z.current=-1/0)};e.addEventListener("scroll",t,{passive:!0}),e.addEventListener("wheel",o,{passive:!0}),e.addEventListener("touchstart",u,{passive:!0}),e.addEventListener("touchmove",c,{passive:!0}),e.addEventListener("touchend",l,{passive:!0}),e.addEventListener("touchcancel",l,{passive:!0}),e.addEventListener("mousedown",d,{passive:!0}),e.addEventListener("pointerover",n,{passive:!0,capture:!0}),e.addEventListener("pointerleave",r,{passive:!0}),e.addEventListener("pointerdown",a,{passive:!0,capture:!0}),p.addEventListener("keydown",_,{capture:!0}),p.addEventListener("mouseup",g,{passive:!0}),p.addEventListener("contextmenu",g,{passive:!0}),p.addEventListener("dragend",g,{passive:!0}),h?.addEventListener("blur",g,{passive:!0}),Je(e).observe(e),Xe(e).observe(e,{childList:!0,subtree:!0}),et(e).observe(e,{childList:!0,subtree:!0,characterData:!0});let v=t=>{f.current=performance.now(),G.current=0,e.scrollTop=t,M.current=e.scrollTop,Be(e,t)};x.set(e,v),nt.current=()=>{e.removeEventListener("scroll",t),e.removeEventListener("wheel",o),e.removeEventListener("touchstart",u),e.removeEventListener("touchmove",c),e.removeEventListener("touchend",l),e.removeEventListener("touchcancel",l),e.removeEventListener("mousedown",d),e.removeEventListener("pointerover",n,{capture:!0}),e.removeEventListener("pointerleave",r),e.removeEventListener("pointerdown",a,{capture:!0}),V.current=!1,Ne.current=-1/0,W(),p.removeEventListener("keydown",_,{capture:!0}),p.removeEventListener("mouseup",g),p.removeEventListener("contextmenu",g),p.removeEventListener("dragend",g),h?.removeEventListener("blur",g),P.current=!1,T.current=!1,be.current.clear(),E.current(),D.current?.unobserve(e),je.current?.disconnect(),Me.current?.disconnect(),x.get(e)===v&&x.delete(e),nt.current=()=>void 0}},[tt,Y,Je,Xe,et,f,W,Be,m]),at=n(e=>{O.current!==e&&(O.current&&D.current?.unobserve(O.current),O.current=e,e&&Je(e).observe(e))},[Je]);e(()=>()=>{nt.current(),rt.current=null,D.current?.disconnect(),je.current?.disconnect(),Me.current?.disconnect(),D.current=null,je.current=null,Me.current=null,O.current=null},[]);let ot=n(e=>{k.current=N.current()?.scrollTop??0,F.current=k.current,A.current=0,we.current={lastT:0,upTotal:0},M.current=null,I.current=-1/0,L.current=-1/0,z.current=-1/0,R.current=-1/0,De.current=0,G.current=0,K.current=1/0,q.current=null,J.current=null,W(),Y(e)},[Y,N,W]),st=t(u);e(()=>{Object.is(st.current,u)||(st.current=u,ot(ke.current))},[u,ot,ke]);let ct=n((e,t)=>{st.current=e,ot(t)},[ot]),lt=n(e=>{let t=d();if(!t)return;if(z.current=-1/0,T.current){F.current=t.scrollTop,Y(!0);return}let n=y(t,m?.current);if(e!=="smooth")X(t,n);else{let r=performance.now();f.current=r,G.current=n-t.scrollTop>2?r+pe:0,t.scrollTo({top:n,behavior:e})}k.current=t.scrollTop,A.current=0,K.current=0,Y(!0)},[d,Y,f,X,m]),ut=n(e=>{let t=d();if(!t||T.current)return;let n=Math.max(0,t.scrollHeight-t.clientHeight);X(t,Math.min(Math.max(0,e),n)),Be(t,e)},[d,X,Be]),dt=r(()=>{let e=(e,t)=>e!==null&&e.nodeType===1&&t.contains(e),t=(e,t)=>e.closest("[data-transcript-continues-turn],[data-transcript-not-rows]")!==null||We.current?.(t)===!0;return{onPointerDownCapture:n=>{!e(n.target,n.currentTarget)||t(n.target,n)||(Oe.current=performance.now(),Y(!1))},onKeyDownCapture:n=>{if(!ee(n.key)||!e(n.target,n.currentTarget))return;let r=n.target;v(r)||t(r,n)||(Oe.current=performance.now(),Y(!1))}}},[Y]),ft=t(C);e(()=>{if(C&&!ft.current)J.current=w.current?null:k.current;else if(ft.current&&!C){Q.current(!1);let e=J.current;J.current=null;let t=N.current();e!==null&&t!==null&&!w.current&&t.scrollTop<e-1&&e<=t.scrollHeight-t.clientHeight+1&&ut(e)}ft.current=C},[C,N,ut]);let pt=n(()=>w.current,[]),mt=n(()=>{let e=j.current;return j.current=ge(),e},[]),ht=n(()=>De.current,[]),gt=n(()=>Oe.current,[]),_t=n(e=>{let t=d();return t?y(t,m?.current,e):0},[d,m]);return r(()=>({pinnedRef:w,isPinned:pt,setPinned:Y,subscribe:ze,scrollToBottom:lt,openDocument:ct,jumpTo:ut,resnap:Ve,attach:it,attachContent:at,holdProps:dt,takeEarlyReadStats:mt,getLastFollowWriteAt:ht,getLastHoldAt:gt,settledBottom:_t}),[pt,Y,ze,lt,ct,ut,Ve,it,at,dt,mt,ht,gt,_t])})(c);
}
