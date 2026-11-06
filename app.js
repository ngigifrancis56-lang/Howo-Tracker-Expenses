import { $, today, money, blank, uid, opts, esc, isoLocal, dateFromISO, weekBounds, name, table } from "./modules/utils.js";
import { createDashboard } from "./modules/dashboard.js";
import { createChat } from "./modules/chat.js";
import { createAuth } from "./modules/auth.js";
import { initRecords } from "./modules/records.js";
import { initDataTools } from "./modules/data-tools.js";
import { initReports } from "./modules/reports.js";
import { driverCalc, expenseTotal } from "./modules/finance.js";

const state={db:null,auth:null,user:null,cloudReady:false,syncPending:localStorage.getItem('fleetledger-sync-pending')==='1',authUnsubscribe:null,authApp:null,chatUnsubscribe:null};

let data=JSON.parse(localStorage.getItem('fleetledger-data')||'null')||blank();

const dashboard=createDashboard({getData:()=>data});
const {render,renderWeekly}=dashboard;
const chatApi=createChat({state});
const {startFleetChat,stopFleetChat}=chatApi;
const authApi=createAuth({state,getData:()=>data,setData:value=>{data=value},render,status,startFleetChat,stopFleetChat});
let localChangeVersion=0;
function status(s){
  $('firebaseStatus').textContent=s;
  $('syncBadge').textContent=state.syncPending?'Pending sync · saved on this device':state.cloudReady?'☁ Cloud Sync Active':'Local Storage · Not connected';
  $('syncBadge').style.background=state.syncPending?'#fff0d6':state.cloudReady?'#d9f4e7':'#fff6e5';
  $('syncBadge').style.color=state.syncPending?'#815600':state.cloudReady?'#16804a':'#815600';
}
let syncInFlight=false;
async function syncPendingChanges(){
  if(syncInFlight||!state.user||!state.db||!state.cloudReady||!state.syncPending)return;
  syncInFlight=true;
  try{
    while(state.syncPending){
      const version=localChangeVersion;
      await authApi.syncCloud();
      if(version===localChangeVersion){
        state.syncPending=false;
        localStorage.removeItem('fleetledger-sync-pending');
        status('All changes synced to Firebase · '+(state.user.email||'your account'));
      }
    }
  }catch(e){
    status('Pending sync · saved on this device. Will retry when connected. ('+e.message+')');
  }finally{syncInFlight=false;}
}
const save=()=>{
  localChangeVersion++;
  localStorage.setItem('fleetledger-data',JSON.stringify(data));
  state.syncPending=true;
  localStorage.setItem('fleetledger-sync-pending','1');
  render();
  status(state.cloudReady?'Saving changes to Firebase…':'Saved on this device · waiting for cloud connection');
  syncPendingChanges();
};
const download=(filename,content,type)=>{let a=document.createElement('a'),u=URL.createObjectURL(new Blob([content],{type}));a.href=u;a.download=filename;a.click();URL.revokeObjectURL(u)};
initRecords({getData:()=>data,save});
initDataTools({getData:()=>data,setData:value=>{data=value},save,download,render});
initReports({getData:()=>data});




document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab));render()});
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>document.querySelector(`[data-tab="${b.dataset.go}"]`).click());
$('floatingChatButton').onclick=()=>document.querySelector('[data-tab="chat"]').click();
render();
authApi.initialize();
// Retry cloud loading/synchronisation as soon as connectivity returns. Pending
// edits remain in local storage until Firebase confirms the write.
window.addEventListener('online',()=>{
  if(!state.user||!state.db)return;
  if(state.cloudReady) syncPendingChanges();
  else authApi.reconnectCloud().then(()=>syncPendingChanges()).catch(e=>status('Cloud reconnect failed · local records are safe. Will retry. ('+e.message+')'));
});
window.addEventListener('focus',()=>{
  if(!navigator.onLine||!state.user||!state.db)return;
  if(state.cloudReady) syncPendingChanges();
  else authApi.reconnectCloud().then(()=>syncPendingChanges()).catch(e=>status('Cloud reconnect failed · local records are safe. Will retry. ('+e.message+')'));
});
$('weekStart').onchange=renderWeekly;
$('thisWeekBtn').onclick=()=>{$('weekStart').value=weekBounds(today()).from;renderWeekly()};

// Pull down from the top of any app tab to reload the latest saved app version.
// Firebase session persistence and cloud records are left untouched.
(function enablePullToRefresh(){
let startY=0,deltaY=0,tracking=false,ready=false;
const indicator=$('pullRefreshIndicator'),threshold=88;
function setMessage(message){indicator.querySelector('.refresh-message').textContent=message}
function reset(){tracking=false;deltaY=0;ready=false;indicator.classList.remove('visible','ready','refreshing');setMessage('Pull to refresh')}
window.addEventListener('touchstart',e=>{
if(e.touches.length!==1)return;
const target=e.target;
if(target.closest('input,textarea,select,button,[contenteditable="true"],.chat-messages'))return;
if(window.scrollY>0)return;
startY=e.touches[0].clientY;deltaY=0;tracking=true;
},{passive:true});
window.addEventListener('touchmove',e=>{
if(!tracking||e.touches.length!==1)return;
deltaY=Math.max(0,e.touches[0].clientY-startY);
if(deltaY>8){indicator.classList.add('visible');const isReady=deltaY>=threshold;setMessage(isReady?'Release to refresh':'Pull to refresh');indicator.classList.toggle('ready',isReady)}
if(deltaY>12&&window.scrollY<=0)e.preventDefault();
},{passive:false});
window.addEventListener('touchend',()=>{
if(!tracking)return;
ready=deltaY>=threshold;
if(ready){indicator.classList.add('visible','ready','refreshing');setMessage('Refreshing FleetLedger…');window.location.reload();return}
reset();
},{passive:true});
window.addEventListener('touchcancel',reset,{passive:true});
})();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(err=>console.warn('App update check failed:',err)));
