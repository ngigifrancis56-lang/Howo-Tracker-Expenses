import { $, today, blank, name } from "./utils.js";
export function initDataTools({getData,setData,save,download,render}) {
function backup(){download('fleetledger-backup-'+today()+'.json',JSON.stringify(getData(),null,2),'application/json')}
$('backupBtn').onclick=backup;$('backupBtn2').onclick=backup;$('exportBtn').onclick=()=>{let rows=[['date','vehicle','driver','material','quantity','unit','customer','destination','income','fuel','other_cost','driver_pay','notes'],...getData().trips.map(t=>[t.date,name(getData().vehicles,t.vehicleId),name(getData().drivers,t.driverId),t.material,t.quantity,t.unit,t.customer,t.destination,t.income,t.fuel,t.otherCost,t.driverPay,t.notes])];download('fleetledger-trips-'+today()+'.csv',rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n'),'text/csv')};
$('restoreFile').onchange=async e=>{try{let d=JSON.parse(await e.target.files[0].text());if(!d.vehicles||!d.drivers||!d.trips)throw Error('Invalid backup');if(confirm('Replace current records with this backup?')){setData({...blank(),...d});save();alert('Backup restored')}}catch(err){alert('Could not restore: '+err.message)}};
$('clearData').onclick=()=>{if(confirm('Permanently delete all local app records? Download a backup first.')){setData(blank());save()}};
$('tripFilterDate').onchange=render;$('tripFilterVehicle').onchange=render;

}
