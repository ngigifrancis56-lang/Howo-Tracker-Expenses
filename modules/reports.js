import { $, money, name, table, esc } from "./utils.js";
import { expenseTotal } from "./finance.js";

export function initReports({getData}) {
  let latestReport=null;

  function collectReport() {
    const data=getData();
    const from=$('reportFrom').value;
    const to=$('reportTo').value;
    const vehicleId=$('reportVehicle').value;
    const trips=data.trips.filter(x=>(!from||x.date>=from)&&(!to||x.date<=to)&&(!vehicleId||x.vehicleId===vehicleId));
    const expenses=data.expenses.filter(x=>(!from||x.date>=from)&&(!to||x.date<=to)&&(!vehicleId||x.vehicleId===vehicleId));
    const income=trips.reduce((sum,x)=>sum+Number(x.income||0),0);
    const tripCosts=expenseTotal(trips);
    const otherExpenses=expenses.reduce((sum,x)=>sum+Number(x.amount||0),0);
    const driverPay=trips.reduce((sum,x)=>sum+Number(x.driverPay||0),0);
    return {
      from,to,vehicleId,
      vehicle:vehicleId?name(data.vehicles,vehicleId):'All vehicles',
      trips,expenses,
      income,tripCosts,otherExpenses,
      operatingCosts:tripCosts+otherExpenses,
      driverPay,
      profit:income-tripCosts-otherExpenses-driverPay,
      data
    };
  }

  function renderReport(r) {
    const tripRows=r.trips.map(x=>[
      esc(x.date),esc(name(r.data.vehicles,x.vehicleId)),esc(name(r.data.drivers,x.driverId)),
      esc(x.material),money(x.income),money(Number(x.fuel||0)+Number(x.otherCost||0)),
      money(x.driverPay),money(Number(x.income||0)-Number(x.fuel||0)-Number(x.otherCost||0)-Number(x.driverPay||0))
    ]);
    const expenseRows=r.expenses.map(x=>[
      esc(x.date),esc(name(r.data.vehicles,x.vehicleId)),esc(x.category||'Other'),
      esc(x.vendor||''),money(x.amount),esc(x.notes||'')
    ]);
    $('reportOutput').innerHTML=`<div class="grid">
      <div class="card metric"><small>Trips</small><strong>${r.trips.length}</strong></div>
      <div class="card metric"><small>Income</small><strong>${money(r.income)}</strong></div>
      <div class="card metric"><small>Operating costs</small><strong>${money(r.operatingCosts)}</strong></div>
      <div class="card metric"><small>Driver pay</small><strong>${money(r.driverPay)}</strong></div>
      <div class="card metric"><small>Net profit</small><strong class="${r.profit<0?'red':'green'}">${money(r.profit)}</strong></div>
    </div>
    <div class="section"><h3>Trip details</h3>${table(['Date','Vehicle','Driver','Material','Income','Trip costs','Driver pay','Net'],tripRows)}</div>
    <div class="section"><h3>Other expenses</h3>${table(['Date','Vehicle','Category','Vendor','Amount','Notes'],expenseRows)}</div>`;
  }

  function buildPrintDocument(r) {
    const period=(r.from||r.to)?`${r.from||'Start'} to ${r.to||'Present'}`:'All dates';
    const tripRows=r.trips.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(name(r.data.vehicles,x.vehicleId))}</td><td>${esc(name(r.data.drivers,x.driverId))}</td><td>${esc(x.material)}</td><td class="num">${money(x.income)}</td><td class="num">${money(Number(x.fuel||0)+Number(x.otherCost||0))}</td><td class="num">${money(x.driverPay)}</td><td class="num">${money(Number(x.income||0)-Number(x.fuel||0)-Number(x.otherCost||0)-Number(x.driverPay||0))}</td></tr>`).join('');
    const expenseRows=r.expenses.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(name(r.data.vehicles,x.vehicleId))}</td><td>${esc(x.category||'Other')}</td><td>${esc(x.vendor||'—')}</td><td class="num">${money(x.amount)}</td><td>${esc(x.notes||'')}</td></tr>`).join('');
    const summary=[
      ['Total income',money(r.income)],
      ['Trip fuel & other costs',money(r.tripCosts)],
      ['Vehicle / business expenses',money(r.otherExpenses)],
      ['Total operating costs',money(r.operatingCosts)],
      ['Driver pay',money(r.driverPay)],
      ['NET PROFIT',money(r.profit)]
    ];
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Apex Logistic Group - Fleet Report</title>
      <style>
      *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#172b3a;margin:28px;font-size:11px}
      header{border-bottom:3px solid #1769aa;padding-bottom:14px;margin-bottom:18px}h1{font-size:23px;margin:0 0 5px;color:#102a43}h2{font-size:15px;margin:22px 0 8px;color:#102a43}
      p{margin:4px 0;color:#536575}.meta{display:flex;gap:24px;flex-wrap:wrap;margin-top:10px}
      .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0}
      .tile{border:1px solid #d8e1e8;border-radius:7px;padding:10px}.tile span{display:block;color:#647789;font-size:10px;margin-bottom:5px}.tile strong{font-size:15px}
      table{width:100%;border-collapse:collapse;margin:8px 0 18px}th,td{border:1px solid #dbe3e9;padding:6px;text-align:left;vertical-align:top}th{background:#edf3f8;color:#102a43;font-weight:700}.num{text-align:right;white-space:nowrap}
      .totals{max-width:420px;margin-left:auto}.totals td:last-child{text-align:right;white-space:nowrap}.profit{font-weight:700;background:#edf7f1}
      footer{border-top:1px solid #dbe3e9;padding-top:10px;color:#71808c;margin-top:24px}
      @page{size:A4 landscape;margin:12mm}
      @media print{body{margin:0}.no-print{display:none!important}tr{break-inside:avoid}h2{break-after:avoid}}
      @media(max-width:650px){body{margin:12px}.summary{grid-template-columns:repeat(2,1fr)}}
      </style></head><body>
      <header><h1>Apex Logistic Group</h1><p>Fleet management · Profit & activity report</p>
      <div class="meta"><span><b>Reporting period:</b> ${esc(period)}</span><span><b>Vehicle:</b> ${esc(r.vehicle)}</span><span><b>Generated:</b> ${esc(new Date().toLocaleString())}</span></div></header>
      <div class="summary">
        <div class="tile"><span>Trips completed</span><strong>${r.trips.length}</strong></div>
        <div class="tile"><span>Total income</span><strong>${money(r.income)}</strong></div>
        <div class="tile"><span>Operating costs</span><strong>${money(r.operatingCosts)}</strong></div>
        <div class="tile"><span>Driver pay</span><strong>${money(r.driverPay)}</strong></div>
        <div class="tile"><span>Net profit</span><strong>${money(r.profit)}</strong></div>
      </div>
      <h2>Financial summary</h2><table class="totals"><tbody>${summary.map(([label,value])=>`<tr class="${label==='NET PROFIT'?'profit':''}"><td>${label}</td><td>${value}</td></tr>`).join('')}</tbody></table>
      <h2>Trip register</h2><table><thead><tr><th>Date</th><th>Vehicle</th><th>Driver</th><th>Material</th><th class="num">Income</th><th class="num">Trip costs</th><th class="num">Driver pay</th><th class="num">Net</th></tr></thead><tbody>${tripRows||'<tr><td colspan="8">No trips found for this selection.</td></tr>'}</tbody></table>
      <h2>Vehicle & business expenses</h2><table><thead><tr><th>Date</th><th>Vehicle</th><th>Category</th><th>Vendor</th><th class="num">Amount</th><th>Notes</th></tr></thead><tbody>${expenseRows||'<tr><td colspan="6">No separate expenses found for this selection.</td></tr>'}</tbody></table>
      <footer>Apex Logistic Group · All amounts in Kenyan Shillings (KES) · Confidential business report</footer>
      <div class="no-print" style="margin-top:20px"><button onclick="window.print()">Print / Save as PDF</button><p>Choose “Save as PDF” in the print destination.</p></div>
      <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script>
      </body></html>`;
  }

  $('runReport').onclick=()=>{
    latestReport=collectReport();
    renderReport(latestReport);
    $('exportReportPdf').disabled=false;
  };

  $('exportReportPdf').onclick=()=>{
    if(!latestReport) {
      latestReport=collectReport();
      renderReport(latestReport);
    }
    const printWindow=window.open('','_blank');
    if(!printWindow) {
      alert('Your browser blocked the PDF window. Allow pop-ups for this app and try again.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildPrintDocument(latestReport));
    printWindow.document.close();
  };
}
