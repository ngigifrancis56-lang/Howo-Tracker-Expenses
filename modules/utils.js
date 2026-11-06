export const $=id=>document.getElementById(id);
export const today=()=>new Date().toLocaleDateString('en-CA');
export const money=n=>'KSh '+Number(n||0).toLocaleString('en-KE',{maximumFractionDigits:2});
export const blank=()=>({vehicles:[],drivers:[],trips:[],expenses:[],adjustments:[]});
export function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
export function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export function opts(sel,arr,first){let old=sel.value;sel.innerHTML=(first?'<option value="">'+first+'</option>':'')+arr.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');if(arr.some(x=>x.id===old))sel.value=old;}
export function isoLocal(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
export function dateFromISO(v){let p=String(v||'').split('-').map(Number);return new Date(p[0],p[1]-1,p[2])}
export function weekBounds(value){let d=dateFromISO(value||today());d.setHours(0,0,0,0);let offset=(d.getDay()+6)%7;d.setDate(d.getDate()-offset);let end=new Date(d);end.setDate(end.getDate()+6);return {from:isoLocal(d),to:isoLocal(end)}}
export function name(arr,id){return arr.find(x=>x.id===id)?.name||'—'}
export function table(head,rows){if(!rows.length)return '<div class="empty">No records yet</div>';return `<table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c??''}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
