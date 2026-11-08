import { $, today, money, opts, esc, isoLocal, dateFromISO, weekBounds, name, table } from "./utils.js";
import { driverCalc, expenseTotal } from "./finance.js";
export function createDashboard({getData}) {
function tripsFor(day){return getData().trips.filter(t=>!day||t.date===day)}


function render(){
const data=getData();
if(!$('weekStart').value)$('weekStart').value=weekBounds(today()).from;renderWeekly();
let day=today(),ts=tripsFor(day),ex=data.expenses.filter(e=>e.date===day),income=ts.reduce((s,t)=>s+t.income,0),oper=expenseTotal(ts)+ex.reduce((s,e)=>s+e.amount,0),pay=ts.reduce((s,t)=>s+t.driverPay,0),profit=income-oper-pay;
$('todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
$('mIncome').textContent=money(income);$('mExpense').textContent=money(oper);$('mPay').textContent=money(pay);$('mProfit').textContent=money(profit);$('mProfit').className=profit<0?'red':'green';$('tripCount').textContent=ts.length;$('loadCount').textContent=ts.reduce((s,t)=>s+t.quantity,0).toLocaleString();
let mats={};ts.forEach(t=>mats[t.material]=(mats[t.material]||0)+t.quantity);$('materialSummary').innerHTML=Object.keys(mats).length?Object.entries(mats).map(([k,v])=>`<div class="summaryline"><span>${esc(k)}</span><b>${v}</b></div>`).join(''):'<div class="empty">No trips recorded today</div>';
$('dailyBreakdown').innerHTML=[['Trip income',income],['Fuel & trip costs',expenseTotal(ts)],['Other business expenses',ex.reduce((s,e)=>s+e.amount,0)],['Driver pay earned',pay],['NET PROFIT',profit]].map(([k,v])=>`<div class="summaryline"><span>${k}</span><b class="${k==='NET PROFIT'?(v<0?'red':'green'):''}">${money(v)}</b></div>`).join('');
let rows=ts.slice(-6).reverse();$('recentTrips').innerHTML=table(['Date','Vehicle','Material','Driver','Income','Profit'],rows.map(t=>[t.date,name(data.vehicles,t.vehicleId),t.material,name(data.drivers,t.driverId),money(t.income),money(t.income-t.fuel-t.otherCost-t.driverPay)]));
opts($('tripVehicle'),data.vehicles,'Select vehicle');opts($('expenseVehicle'),data.vehicles,'General / no vehicle');opts($('tripDriver'),data.drivers,'Select driver');opts($('adjustDriver'),data.drivers,'Select driver');opts($('settlementDriver'),data.drivers,'Select driver');$('settlementDriver').dispatchEvent(new Event('change'));['tripFilterVehicle','reportVehicle'].forEach(id=>opts($(id),data.vehicles,'All vehicles'));
let filterDate=$('tripFilterDate').value,filterV=$('tripFilterVehicle').value;
const visibleTrips=data.trips.filter(t=>(!filterDate||t.date===filterDate)&&(!filterV||t.vehicleId===filterV)).slice().reverse();
$('tripTable').innerHTML=visibleTrips.length?'<div class="trip-list">'+visibleTrips.map((t,i)=>`<details class="trip-item"><summary class="trip-summary"><span class="trip-heading"><strong>Trip ${visibleTrips.length-i} · ${esc(t.date||'Undated')}</strong><small>${esc(name(data.vehicles,t.vehicleId)||'Vehicle not set')} · ${esc(t.material||'Material not set')} · ${Number(t.quantity||0)} ${esc(t.unit||'load')}</small></span><span class="trip-view-label">View Trip <span aria-hidden="true">⌄</span></span></summary><div class="trip-detail-grid"><div><small>Driver</small><strong>${esc(name(data.drivers,t.driverId)||'—')}</strong></div><div><small>Customer</small><strong>${esc(t.customer||'—')}</strong></div><div><small>Delivery site / destination</small><strong>${esc(t.destination||'—')}</strong></div><div><small>Trip income</small><strong>${money(t.income)}</strong></div><div><small>Driver pay</small><strong>${money(t.driverPay)}</strong></div><div><small>Fuel cost</small><strong>${money(t.fuel)}</strong></div><div><small>Other trip costs</small><strong>${money(t.otherCost)}</strong></div><div><small>Trip profit</small><strong>${money(Number(t.income||0)-Number(t.fuel||0)-Number(t.otherCost||0)-Number(t.driverPay||0))}</strong></div><div class="trip-notes"><small>Notes</small><strong>${esc(t.notes||'—')}</strong></div></div><div class="actions trip-manage"><button class="btn secondary small" data-edit-trip="${t.id}">Edit</button><button class="btn danger small" data-delete="trips:${t.id}">Delete</button></div></details>`).join('')+'</div>':'<div class="empty">No trips match the selected filters.</div>';
$('driverTable').innerHTML=table(['Driver','Phone','Trips','Earned pay','Advances','Deductions','Settled','Balance due','Manage'],data.drivers.map(d=>{let c=driverCalc(data,d.id);return [esc(d.name),esc(d.phone||'—'),c.trips,money(c.earned),money(c.advances),money(c.ded),money(c.settled),`<b class="${c.balance<0?'red':'green'}">${money(c.balance)}</b>`,`<div class="actions"><button class="btn secondary small" data-edit-driver="${d.id}">Edit</button><button class="btn danger small" data-delete="drivers:${d.id}">Delete</button></div>`]}));
$('adjustTable').innerHTML=table(['Date','Driver','Type','Amount','Note',''],data.adjustments.slice().reverse().map(a=>[a.date,name(data.drivers,a.driverId),a.type,money(a.amount),esc(a.note),`<button class="btn danger small" data-delete="adjustments:${a.id}">Delete</button>`]));
$('expenseTable').innerHTML=table(['Date','Vehicle','Category','Vendor','Amount','Notes',''],data.expenses.slice().reverse().map(e=>[e.date,name(data.vehicles,e.vehicleId)||'General',esc(e.category),esc(e.vendor),money(e.amount),esc(e.notes),`<button class="btn danger small" data-delete="expenses:${e.id}">Delete</button>`]));
$('vehicleTable').innerHTML=table(['Vehicle','Type','Trips','Income','Operating costs',''],data.vehicles.map(v=>{let a=data.trips.filter(t=>t.vehicleId===v.id),b=data.expenses.filter(e=>e.vehicleId===v.id);return [esc(v.name),esc(v.type),a.length,money(a.reduce((s,t)=>s+t.income,0)),money(expenseTotal(a)+b.reduce((s,e)=>s+e.amount,0)),`<button class="btn danger small" data-delete="vehicles:${v.id}">Delete</button>`]}));
$('fleetSummary').innerHTML=`<div class="summaryline"><span>Vehicles</span><b>${data.vehicles.length}</b></div><div class="summaryline"><span>Drivers</span><b>${data.drivers.length}</b></div><div class="summaryline"><span>All recorded trips</span><b>${data.trips.length}</b></div>`;
}



function renderWeekly(){
const data=getData();
let chosen=$('weekStart').value||today(),bounds=weekBounds(chosen),from=bounds.from,to=bounds.to;
let ts=data.trips.filter(x=>x.date>=from&&x.date<=to),ex=data.expenses.filter(x=>x.date>=from&&x.date<=to);
let income=ts.reduce((a,x)=>a+Number(x.income||0),0),tripCosts=expenseTotal(ts),other=ex.reduce((a,x)=>a+Number(x.amount||0),0),pay=ts.reduce((a,x)=>a+Number(x.driverPay||0),0),oper=tripCosts+other,profit=income-oper-pay;
$('weekRangeLabel').textContent='Week: '+dateFromISO(from).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})+' – '+dateFromISO(to).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
$('wIncome').textContent=money(income);$('wExpenses').textContent=money(oper);$('wPay').textContent=money(pay);$('wProfit').textContent=money(profit);$('wProfit').className=profit<0?'red':'green';$('wTrips').textContent=ts.length;$('wOtherExpenses').textContent=money(other);$('wTripCosts').textContent=money(tripCosts);$('wAverage').textContent=money(ts.length?income/ts.length:0);
let daily=[];for(let i=0;i<7;i++){let d=dateFromISO(from);d.setDate(d.getDate()+i);let key=isoLocal(d),dayTrips=ts.filter(x=>x.date===key),dayExpenses=ex.filter(x=>x.date===key),inc=dayTrips.reduce((a,x)=>a+Number(x.income||0),0),cost=expenseTotal(dayTrips)+dayExpenses.reduce((a,x)=>a+Number(x.amount||0),0),driver=dayTrips.reduce((a,x)=>a+Number(x.driverPay||0),0);daily.push([d.toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'}),dayTrips.length,money(inc),money(cost),money(driver),money(inc-cost-driver)])}
$('weeklyDailyTable').innerHTML=table(['Day','Trips','Income','Operating costs','Driver pay','Net profit'],daily);
$('weeklyBreakdown').innerHTML=`<div class="financial-summary">
<div class="financial-profit"><div><span class="financial-label">WEEKLY NET PROFIT</span><span class="financial-caption">Income after costs and driver pay</span></div><strong class="${profit<0?'red':'green'}">${money(profit)}</strong></div>
<div class="financial-rows">
<div class="financial-row income-row"><span><i>＋</i> Trip income</span><b>${money(income)}</b></div>
<div class="financial-row"><span><i>−</i> Fuel & trip costs</span><b>${money(tripCosts)}</b></div>
<div class="financial-row"><span><i>−</i> Other business expenses</span><b>${money(other)}</b></div>
<div class="financial-row financial-total"><span>Total operating expenses</span><b>${money(oper)}</b></div>
<div class="financial-row"><span><i>−</i> Driver pay earned</span><b>${money(pay)}</b></div>
</div>
<div class="financial-equation"><span>Trip income − operating expenses − driver pay</span><b>${money(income)} − ${money(oper)} − ${money(pay)}</b></div>
</div>`;
let drivers=data.drivers.map(d=>{let ds=ts.filter(x=>x.driverId===d.id),earned=ds.reduce((a,x)=>a+Number(x.driverPay||0),0),adj=data.adjustments.filter(a=>a.driverId===d.id&&a.date>=from&&a.date<=to),adv=adj.filter(a=>a.type==='advance').reduce((a,x)=>a+Number(x.amount||0),0),ded=adj.filter(a=>a.type==='deduction').reduce((a,x)=>a+Number(x.amount||0),0),paid=adj.filter(a=>a.type==='payment').reduce((a,x)=>a+Number(x.amount||0),0);return [esc(d.name),ds.length,money(earned),money(adv),money(ded),money(paid),money(earned-adv-ded-paid)]}).filter(r=>r[1]||r.slice(3).some(x=>x!=='KSh 0'));
$('weeklyDriverTable').innerHTML=table(['Driver','Trips','Pay earned','Advances','Deductions','Settlements','Week balance'],drivers);
$('weeklyTripTable').innerHTML=table(['Date','Vehicle','Driver','Material','Income','Trip costs','Driver pay','Trip profit'],ts.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(x=>[x.date,name(data.vehicles,x.vehicleId),name(data.drivers,x.driverId),esc(x.material),money(x.income),money(Number(x.fuel||0)+Number(x.otherCost||0)),money(x.driverPay),money(Number(x.income||0)-Number(x.fuel||0)-Number(x.otherCost||0)-Number(x.driverPay||0))]));
}



return {render,renderWeekly};
}
