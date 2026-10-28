"use client";

/**
 * Inspector injected into the prototype iframe so Select mode can pick
 * components like a design tool: hovering outlines any element, clicking
 * selects it (without triggering its own handlers) and reports it to the
 * parent window. Clicking the page background reports a deselect.
 */

export interface InspectedNode {
  tag: string;
  text: string;
  id: string | null;
  classes: string[];
}

/** Append the inspector script to arbitrary HTML, with or without body. */
export function injectInspector(html: string): string {
  const script = `<script>(function(){var hov=null;var css=document.createElement('style');css.textContent='[data-mv-hover]{outline:2px solid #4da3ff !important;outline-offset:1px;cursor:pointer}[data-mv-sel]{outline:2px solid #ffffff !important;outline-offset:2px}';(document.head||document.documentElement).appendChild(css);function label(el){var t='';try{t=((el.innerText||'').trim().replace(/\\s+/g,' ').slice(0,80));}catch(e){}var cls='';try{cls=typeof el.className==='string'?el.className:'';}catch(e){}return{tag:(el.tagName||'').toLowerCase(),text:t,id:el.id||null,classes:String(cls).split(' ').filter(Boolean).slice(0,3)};}function clearSel(){var prev=document.querySelector('[data-mv-sel]');if(prev)prev.removeAttribute('data-mv-sel');}document.addEventListener('mouseover',function(e){var el=e.target&&e.target.closest?e.target.closest('body *:not(script):not(style)'):null;if(hov&&hov!==el)hov.removeAttribute('data-mv-hover');hov=el;if(hov)hov.setAttribute('data-mv-hover','');});document.addEventListener('click',function(e){var el=e.target&&e.target.closest?e.target.closest('body *'):null;if(!el||el===document.body||el===document.documentElement){clearSel();try{parent.postMessage({type:'musevibe-deselect'},'*');}catch(err){}return;}e.preventDefault();e.stopPropagation();clearSel();el.setAttribute('data-mv-sel','');try{parent.postMessage(Object.assign({type:'musevibe-select'},label(el)),'*');}catch(err){}},true);document.addEventListener('keydown',function(e){if(e.key==='Escape'){clearSel();try{parent.postMessage({type:'musevibe-deselect'},'*');}catch(err){}}});window.addEventListener('message',function(e){var d=e.data||{};if(d.type==='musevibe-clear')clearSel();});})();</script>`;
  if (/<\/body\s*>/i.test(html)) return html.replace(/<\/body\s*>/i, `${script}</body>`);
  return `${html}${script}`;
}

/** Human-readable label for the selection chip. */
export function nodeLabel(node: InspectedNode): string {
  const name = node.id ? `#${node.id}` : node.tag.toUpperCase();
  return node.text ? `${name} · "${node.text}"` : name;
}
