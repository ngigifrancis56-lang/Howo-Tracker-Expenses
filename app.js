import { $, today, money, blank, uid, opts, esc, isoLocal, dateFromISO, weekBounds, name, table } from "./modules/utils.js";
import { createDashboard } from "./modules/dashboard.js";
import { createChat } from "./modules/chat.js";
import { createAuth } from "./modules/auth.js";
import { driverCalc, expenseTotal } from "./modules/finance.js";

const state={db:null,auth:null,user:null,state.cloudReady:false,authUnsubscribe:null,authApp:null,chatUnsubscribe:null};

let data=JSON.parse(localStorage.getItem('fleetledger-data')||'null')||blank();

const dashboard=createDashboard({getData:()=>data});
const {render,renderWeekly}=dashboard;
const chatApi=createChat({state});
const {startFleetChat,stopFleetChat}=chatApi;
const authApi=createAuth({state,getData:()=>data,setData:value=>{data=value},render,status,startFleetChat,stopFleetChat});
const save=()=>{localStorage.setItem('fleetledger-data',JSON.stringify(data));render();if(state.cloudReady)authApi.syncCloud().catch(e=>status('Cloud sync error: '+e.message));};
function status(s){$('firebaseStatus').textContent=s;$('syncBadge').textContent=state.cloudReady?'☁ Cloud Sync Active':'Local Storage · Not connected';$('syncBadge').style.background=state.cloudReady?'#d9f4e7':'#fff6e5';$('syncBadge').style.color=state.cloudReady?'#16804a':'#815600';}



document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab));render()});
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>document.querySelector(`[data-tab="${b.dataset.go}"]`).click());
$('floatingChatButton').onclick=()=>document.querySelector('[data-tab="chat"]').click();
let editingTripId=null;function resetTripEditor(){editingTripId=null;$('tripForm').reset();$('tripDate').value=today();$('fuel').value='';$('otherCost').value='';$('tripFormTitle').textContent='Record a trip';$('tripSaveBtn').textContent='Save trip';$('cancelTripEdit').classList.add('hidden')}
document.addEventListener('click',e=>{let tripEdit=e.target.closest('[data-edit-trip]');if(tripEdit){let t=data.trips.find(x=>x.id===tripEdit.dataset.editTrip);if(!t)return;editingTripId=t.id;$('tripDate').value=t.date||today();$('tripVehicle').value=t.vehicleId||'';$('tripDriver').value=t.driverId||'';let known=[...$('material').options].some(o=>o.value===t.material);$('material').value=known?t.material:'Other';$('materialOther').value=known?'':(t.material||'');$('quantity').value=t.quantity??'';$('unit').value=t.unit||'load';$('customer').value=t.customer||'';$('destination').value=t.destination||'';$('income').value=t.income??'';$('driverPay').value=t.driverPay??'';$('fuel').value=t.fuel??0;$('otherCost').value=t.otherCost??0;$('tripNotes').value=t.notes||'';$('tripFormTitle').textContent='Edit trip record';$('tripSaveBtn').textContent='Save trip changes';$('cancelTripEdit').classList.remove('hidden');$('tripDate').scrollIntoView({behavior:'smooth',block:'center'});return}let edit=e.target.closest('[data-edit-driver]');if(edit){let d=data.drivers.find(x=>x.id===edit.dataset.editDriver);if(!d)return;editingDriverId=d.id;$('driverName').value=d.name||'';$('driverPhone').value=d.phone||'';$('driverFormTitle').textContent='Edit driver record';$('driverSaveBtn').textContent='Save changes';$('cancelDriverEdit').classList.remove('hidden');$('driverName').focus();return}let b=e.target.closest('[data-delete]');if(!b)return;let [key,id]=b.dataset.delete.split(':');if(key==='drivers'){let hasTrips=data.trips.some(t=>t.driverId===id),hasAdjustments=data.adjustments.some(a=>a.driverId===id);if(hasTrips||hasAdjustments){alert('This driver has trip or payment history. To protect your records, deletion is blocked. You can edit the driver details instead.');return}}if(confirm('Delete this record?')){data[key]=data[key].filter(x=>x.id!==id);save()}});
$('tripDate').value=today();$('expenseDate').value=today();$('adjustDate').value=today();
$('cancelTripEdit').onclick=resetTripEditor;$('tripForm').onsubmit=e=>{e.preventDefault();let d=data.drivers.find(x=>x.id===$('tripDriver').value);if(!d){alert('Please select a driver.');return}let record={date:$('tripDate').value,vehicleId:$('tripVehicle').value,driverId:d.id,driverPay:Number($('driverPay').value),material:$('material').value==='Other'?$('materialOther').value.trim()||'Other':$('material').value,quantity:Number($('quantity').value),unit:$('unit').value,customer:$('customer').value.trim(),destination:$('destination').value.trim(),income:Number($('income').value),fuel:Number($('fuel').value||0),otherCost:Number($('otherCost').value||0),notes:$('tripNotes').value.trim()};if(editingTripId){let old=data.trips.find(x=>x.id===editingTripId);if(!old)return;Object.assign(old,record);resetTripEditor();save();alert('Trip record updated. Driver pay and profit summaries have been recalculated.')}else{data.trips.push({id:uid(),...record});e.target.reset();$('tripDate').value=today();$('fuel').value='';$('otherCost').value='';save();alert('Trip saved. Driver pay for this trip: '+money(record.driverPay))}};
let editingDriverId=null;function resetDriverEditor(){editingDriverId=null;$('driverForm').reset();$('driverFormTitle').textContent='Add a driver';$('driverSaveBtn').textContent='Add driver';$('cancelDriverEdit').classList.add('hidden')};$('cancelDriverEdit').onclick=resetDriverEditor;$('driverForm').onsubmit=e=>{e.preventDefault();let record={name:$('driverName').value.trim(),phone:$('driverPhone').value.trim()};if(!record.name){alert('Enter the driver name.');return}if(editingDriverId){let d=data.drivers.find(x=>x.id===editingDriverId);if(!d)return;Object.assign(d,record);resetDriverEditor();save();alert('Driver record updated')}else{data.drivers.push({id:uid(),...record});e.target.reset();save();alert('Driver added')}};
$('adjustForm').onsubmit=e=>{e.preventDefault();data.adjustments.push({id:uid(),driverId:$('adjustDriver').value,type:$('adjustType').value,amount:Number($('adjustAmount').value),date:$('adjustDate').value,note:$('adjustNote').value});e.target.reset();$('adjustDate').value=today();save();alert('Driver transaction saved')};
$('expenseForm').onsubmit=e=>{e.preventDefault();data.expenses.push({id:uid(),date:$('expenseDate').value,vehicleId:$('expenseVehicle').value,category:$('expenseCategory').value,amount:Number($('expenseAmount').value),vendor:$('expenseVendor').value,notes:$('expenseNotes').value});e.target.reset();$('expenseDate').value=today();save();alert('Expense saved')};
$('vehicleForm').onsubmit=e=>{e.preventDefault();data.vehicles.push({id:uid(),name:$('vehicleName').value,type:$('vehicleType').value});e.target.reset();save();alert('Vehicle added')};
function download(filename,content,type){let a=document.createElement('a'),u=URL.createObjectURL(new Blob([content],{type}));a.href=u;a.download=filename;a.click();URL.revokeObjectURL(u)}
function backup(){download('fleetledger-backup-'+today()+'.json',JSON.stringify(data,null,2),'application/json')}
$('backupBtn').onclick=backup;$('backupBtn2').onclick=backup;$('exportBtn').onclick=()=>{let rows=[['date','vehicle','driver','material','quantity','unit','customer','destination','income','fuel','other_cost','driver_pay','notes'],...data.trips.map(t=>[t.date,name(data.vehicles,t.vehicleId),name(data.drivers,t.driverId),t.material,t.quantity,t.unit,t.customer,t.destination,t.income,t.fuel,t.otherCost,t.driverPay,t.notes])];download('fleetledger-trips-'+today()+'.csv',rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n'),'text/csv')};
$('restoreFile').onchange=async e=>{try{let d=JSON.parse(await e.target.files[0].text());if(!d.vehicles||!d.drivers||!d.trips)throw Error('Invalid backup');if(confirm('Replace current records with this backup?')){data={...blank(),...d};save();alert('Backup restored')}}catch(err){alert('Could not restore: '+err.message)}};
$('clearData').onclick=()=>{if(confirm('Permanently delete all local app records? Download a backup first.')){data=blank();save()}};
$('tripFilterDate').onchange=render;$('tripFilterVehicle').onchange=render;
$('runReport').onclick=()=>{let f=$('reportFrom').value,t=$('reportTo').value,v=$('reportVehicle').value,ts=data.trips.filter(x=>(!f||x.date>=f)&&(!t||x.date<=t)&&(!v||x.vehicleId===v)),ex=data.expenses.filter(x=>(!f||x.date>=f)&&(!t||x.date<=t)&&(!v||x.vehicleId===v)),inc=ts.reduce((s,x)=>s+x.income,0),op=expenseTotal(ts)+ex.reduce((s,x)=>s+x.amount,0),dp=ts.reduce((s,x)=>s+x.driverPay,0);$('reportOutput').innerHTML=`<div class="grid"><div class="card metric"><small>Trips</small><strong>${ts.length}</strong></div><div class="card metric"><small>Income</small><strong>${money(inc)}</strong></div><div class="card metric"><small>Costs</small><strong>${money(op)}</strong></div><div class="card metric"><small>Net profit</small><strong class="${inc-op-dp<0?'red':'green'}">${money(inc-op-dp)}</strong></div></div><div class="section">${table(['Date','Vehicle','Driver','Material','Income','Costs','Driver pay','Net'],ts.map(x=>[x.date,name(data.vehicles,x.vehicleId),name(data.drivers,x.driverId),esc(x.material),money(x.income),money(x.fuel+x.otherCost),money(x.driverPay),money(x.income-x.fuel-x.otherCost-x.driverPay)]))}</div>`};
render();
authApi.initialize();
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
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
