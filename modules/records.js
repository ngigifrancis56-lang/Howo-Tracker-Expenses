import { $, today, uid, money, weekBounds, dateFromISO, isoLocal, opts } from "./utils.js";
export function initRecords({getData,save,requestDeletionAuthorization}) {
let editingTripId=null;function resetTripEditor(){editingTripId=null;$('tripForm').reset();$('tripDate').value=today();$('fuel').value='';$('otherCost').value='';$('tripFormTitle').textContent='Record a trip';$('tripSaveBtn').textContent='Save trip';$('cancelTripEdit').classList.add('hidden')}
document.addEventListener('click',async e=>{let tripEdit=e.target.closest('[data-edit-trip]');if(tripEdit){let t=getData().trips.find(x=>x.id===tripEdit.dataset.editTrip);if(!t)return;editingTripId=t.id;$('tripDate').value=t.date||today();$('tripVehicle').value=t.vehicleId||'';$('tripDriver').value=t.driverId||'';let known=[...$('material').options].some(o=>o.value===t.material);$('material').value=known?t.material:'Other';$('materialOther').value=known?'':(t.material||'');$('quantity').value=t.quantity??'';$('unit').value=t.unit||'load';$('customer').value=t.customer||'';$('destination').value=t.destination||'';$('income').value=t.income??'';$('driverPay').value=t.driverPay??'';$('fuel').value=t.fuel??0;$('otherCost').value=t.otherCost??0;$('tripNotes').value=t.notes||'';$('tripFormTitle').textContent='Edit trip record';$('tripSaveBtn').textContent='Save trip changes';$('cancelTripEdit').classList.remove('hidden');$('tripDate').scrollIntoView({behavior:'smooth',block:'center'});return}let edit=e.target.closest('[data-edit-driver]');if(edit){let d=getData().drivers.find(x=>x.id===edit.dataset.editDriver);if(!d)return;editingDriverId=d.id;$('driverName').value=d.name||'';$('driverPhone').value=d.phone||'';$('driverFormTitle').textContent='Edit driver record';$('driverSaveBtn').textContent='Save changes';$('cancelDriverEdit').classList.remove('hidden');$('driverName').focus();return}let b=e.target.closest('[data-delete]');if(!b)return;let [key,id]=b.dataset.delete.split(':');if(key==='drivers'){let hasTrips=getData().trips.some(t=>t.driverId===id),hasAdjustments=getData().adjustments.some(a=>a.driverId===id);if(hasTrips||hasAdjustments){alert('This driver has trip or payment history. To protect your records, deletion is blocked. You can edit the driver details instead.');return}}if(confirm('Delete this record?')){const approved=await requestDeletionAuthorization(key,id);if(!approved)return;const record=getData()[key].find(x=>x.id===id);if(!record)return;getData()[key]=getData()[key].filter(x=>x.id!==id);save({deletedRecord:{collection:key,id,label:record.name||record.customer||record.category||record.material||record.vendor||id,date:record.date||null}})}});
$('tripDate').value=today();$('expenseDate').value=today();$('adjustDate').value=today();
$('cancelTripEdit').onclick=resetTripEditor;$('tripForm').onsubmit=e=>{e.preventDefault();let d=getData().drivers.find(x=>x.id===$('tripDriver').value);if(!d){alert('Please select a driver.');return}let record={date:$('tripDate').value,vehicleId:$('tripVehicle').value,driverId:d.id,driverPay:Number($('driverPay').value),material:$('material').value==='Other'?$('materialOther').value.trim()||'Other':$('material').value,quantity:Number($('quantity').value),unit:$('unit').value,customer:$('customer').value.trim(),destination:$('destination').value.trim(),income:Number($('income').value),fuel:Number($('fuel').value||0),otherCost:Number($('otherCost').value||0),notes:$('tripNotes').value.trim()};if(editingTripId){let old=getData().trips.find(x=>x.id===editingTripId);if(!old)return;Object.assign(old,record);resetTripEditor();save();alert('Trip record updated. Driver pay and profit summaries have been recalculated.')}else{getData().trips.push({id:uid(),...record});e.target.reset();$('tripDate').value=today();$('fuel').value='';$('otherCost').value='';save();alert('Trip saved. Driver pay for this trip: '+money(record.driverPay))}};
let editingDriverId=null;function resetDriverEditor(){editingDriverId=null;$('driverForm').reset();$('driverFormTitle').textContent='Add a driver';$('driverSaveBtn').textContent='Add driver';$('cancelDriverEdit').classList.add('hidden')};$('cancelDriverEdit').onclick=resetDriverEditor;$('driverForm').onsubmit=e=>{e.preventDefault();let record={name:$('driverName').value.trim(),phone:$('driverPhone').value.trim()};if(!record.name){alert('Enter the driver name.');return}if(editingDriverId){let d=getData().drivers.find(x=>x.id===editingDriverId);if(!d)return;Object.assign(d,record);resetDriverEditor();save();alert('Driver record updated')}else{getData().drivers.push({id:uid(),...record});e.target.reset();save();alert('Driver added')}};
$('adjustForm').onsubmit=e=>{e.preventDefault();getData().adjustments.push({id:uid(),driverId:$('adjustDriver').value,type:$('adjustType').value,amount:Number($('adjustAmount').value),date:$('adjustDate').value,note:$('adjustNote').value});e.target.reset();$('adjustDate').value=today();save();alert('Driver transaction saved')};
function settlementBounds(value){const b=weekBounds(value||today()),sat=dateFromISO(b.from);sat.setDate(sat.getDate()+5);return {from:b.from,to:isoLocal(sat),saturday:isoLocal(sat)}}
function updateSettlement(){
  const driverId=$('settlementDriver').value,period=settlementBounds($('settlementWeek').value);
  if($('settlementDate').dataset.auto!=='false')$('settlementDate').value=period.saturday;
  $('settlementDate').min=period.from;$('settlementDate').max=period.to;
  $('settlementPeriod').textContent='Pay period: Monday '+period.from+' to Saturday '+period.to+'.';
  const data=getData(),trips=data.trips.filter(t=>t.driverId===driverId&&t.date>=period.from&&t.date<=period.to);
  const tx=data.adjustments.filter(a=>a.driverId===driverId&&a.date>=period.from&&a.date<=period.to);
  const earned=trips.reduce((s,t)=>s+Number(t.driverPay||0),0);
  const advances=tx.filter(a=>a.type==='advance').reduce((s,a)=>s+Number(a.amount||0),0);
  const deductions=tx.filter(a=>a.type==='deduction').reduce((s,a)=>s+Number(a.amount||0),0);
  const paid=tx.filter(a=>a.type==='payment').reduce((s,a)=>s+Number(a.amount||0),0);
  const balance=Math.max(0,earned-advances-deductions-paid);
  $('settlementEarned').textContent=money(earned);$('settlementDeductions').textContent=money(advances+deductions);
  $('settlementPaid').textContent=money(paid);$('settlementBalance').textContent=money(balance);
  $('settlementBalance').className=balance>0?'green':'';
  $('settlementAmount').max=balance.toFixed(2);$('settlementAmount').value=balance>0?balance.toFixed(2):'';
  $('settlementSave').disabled=!driverId||balance<=0;
}
$('settlementWeek').value=today();opts($('settlementDriver'),getData().drivers,'Select driver');
$('settlementWeek').onchange=()=>{$('settlementDate').dataset.auto='true';updateSettlement()};
$('settlementDriver').onchange=updateSettlement;
$('settlementDate').onchange=()=>{$('settlementDate').dataset.auto='false'};
$('settlementForm').onsubmit=e=>{
  e.preventDefault();
  const driverId=$('settlementDriver').value,period=settlementBounds($('settlementWeek').value),amount=Number($('settlementAmount').value);
  if(!driverId||!Number.isFinite(amount)||amount<=0){alert('Select a driver and enter a valid payment amount.');return;}
  const tx=getData().adjustments.filter(a=>a.driverId===driverId&&a.date>=period.from&&a.date<=period.to);
  const earned=getData().trips.filter(t=>t.driverId===driverId&&t.date>=period.from&&t.date<=period.to).reduce((s,t)=>s+Number(t.driverPay||0),0);
  const due=earned-tx.filter(a=>a.type==='advance').reduce((s,a)=>s+Number(a.amount||0),0)-tx.filter(a=>a.type==='deduction').reduce((s,a)=>s+Number(a.amount||0),0)-tx.filter(a=>a.type==='payment').reduce((s,a)=>s+Number(a.amount||0),0);
  if(amount>due+0.001){alert('The payment is greater than the remaining balance for this week.');return;}
  const driver=getData().drivers.find(d=>d.id===driverId);
  getData().adjustments.push({id:uid(),driverId,type:'payment',amount,date:$('settlementDate').value,note:$('settlementNote').value.trim()||('Saturday settlement · week '+period.from+' to '+period.to)});
  save();$('settlementNote').value='';updateSettlement();
  alert('Payment of '+money(amount)+' recorded for '+(driver?.name||'the driver')+'.');
};

$('expenseForm').onsubmit=e=>{e.preventDefault();getData().expenses.push({id:uid(),date:$('expenseDate').value,vehicleId:$('expenseVehicle').value,category:$('expenseCategory').value,amount:Number($('expenseAmount').value),vendor:$('expenseVendor').value,notes:$('expenseNotes').value});e.target.reset();$('expenseDate').value=today();save();alert('Expense saved')};
$('vehicleForm').onsubmit=e=>{e.preventDefault();getData().vehicles.push({id:uid(),name:$('vehicleName').value,type:$('vehicleType').value});e.target.reset();save();alert('Vehicle added')};

}
