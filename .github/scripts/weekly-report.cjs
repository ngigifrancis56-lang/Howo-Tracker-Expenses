const admin = require("firebase-admin");
const { google } = require("googleapis");
const PDFDocument = require("pdfkit");
const RECIPIENTS = ["ngigi.francis5@gmail.com", "irungudennis1234@gmail.com"];
const TZ = "Africa/Nairobi";
const COMPANY_PATH = "companies/apex-logistic-group/appData/fleetledger";
function localNow() { return new Date(Date.now() + 3 * 3600000); }
function key(d) { return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0"); }
function bounds(now, test) {
  const n=localNow(), sunday=new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate()-n.getUTCDay()));
  const saturday=new Date(sunday); saturday.setUTCDate(saturday.getUTCDate()+6);
  const cutoff=test?now:new Date(Date.UTC(saturday.getUTCFullYear(),saturday.getUTCMonth(),saturday.getUTCDate(),16));
  return {from:key(sunday),to:key(saturday),cutoff};
}
function included(x,p) {
  if(!x || !x.date || x.date<p.from || x.date>p.to) return false;
  // updatedAt is populated by the app when a record is first saved or edited.
  // Older records without it are included by business date; their entry time is unknown.
  if(x.updatedAt) { const t=Date.parse(x.updatedAt); if(Number.isFinite(t)&&t>p.cutoff.getTime()) return false; }
  return true;
}
const sum=(xs,fn)=>xs.reduce((a,x)=>a+Number(fn(x)||0),0);
const ksh=n=>"KSh "+Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2});
function makePdf(r) {
  return new Promise((resolve,reject)=>{
    const d=new PDFDocument({size:"A4",layout:"landscape",margin:36}), chunks=[];
    d.on("data",x=>chunks.push(x)); d.on("end",()=>resolve(Buffer.concat(chunks))); d.on("error",reject);
    d.fontSize(20).fillColor("#12324a").text("Apex Logistic Group");
    d.fontSize(11).fillColor("#526575").text("Weekly fleet financial report · Sunday to Saturday");
    d.text("Period: "+r.period.from+" to "+r.period.to);
    d.text("Cut-off: "+r.cutoffLabel+" (Kenya time)").moveDown();
    [["Trips",r.trips.length],["Income",ksh(r.income)],["Trip costs",ksh(r.tripCosts)],["Other expenses",ksh(r.otherExpenses)],["Driver pay earned",ksh(r.driverPay)],["Net profit",ksh(r.profit)]].forEach(x=>d.fontSize(10).fillColor("#172b3a").text(x[0]+": "+x[1]));
    d.moveDown().fontSize(14).fillColor("#12324a").text("Vehicle performance");
    d.fontSize(8).fillColor("#172b3a").text("Vehicle | Trips | Income | Costs | Driver pay | Net",{underline:true});
    (r.vehicles.length?r.vehicles:[{name:"No vehicle records",trips:0,income:0,costs:0,driverPay:0,profit:0}]).forEach(v=>d.text([v.name,v.trips,ksh(v.income),ksh(v.costs),ksh(v.driverPay),ksh(v.profit)].join(" | ")));
    d.moveDown().fontSize(14).fillColor("#12324a").text("Driver settlements");
    d.fontSize(8).fillColor("#172b3a").text("Driver | Earned | Advances | Deductions | Paid | Balance",{underline:true});
    (r.drivers.length?r.drivers:[{name:"No driver records",earned:0,advances:0,deductions:0,paid:0,balance:0}]).forEach(v=>d.text([v.name,ksh(v.earned),ksh(v.advances),ksh(v.deductions),ksh(v.paid),ksh(v.balance)].join(" | ")));
    d.moveDown().fontSize(8).fillColor("#6b7c8b").text("Profit = trip income − fuel/other trip costs − separate vehicle/business expenses − driver pay. Advances and settlements are shown separately and are not deducted twice.");
    d.end();
  });
}
function rawMail(to,subject,body,pdf) {
  const b="apex_weekly_"+Date.now(), lines=[
    "To: "+to.join(", "),"Subject: "+subject,"MIME-Version: 1.0",'Content-Type: multipart/mixed; boundary="'+b+'"',"",
    "--"+b,'Content-Type: text/plain; charset="UTF-8"',"Content-Transfer-Encoding: 7bit","",body,
    "--"+b,'Content-Type: application/pdf; name="Apex-Logistic-Group-Weekly-Report.pdf"',"Content-Transfer-Encoding: base64",'Content-Disposition: attachment; filename="Apex-Logistic-Group-Weekly-Report.pdf"',"",
    pdf.toString("base64").match(/.{1,76}/g).join("\r\n"),"--"+b+"--"
  ];
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}
async function main() {
  const test=process.env.TEST_MODE==="true", serviceAccount=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if(!admin.apps.length) admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
  const snap=await admin.firestore().doc(COMPANY_PATH).get();
  if(!snap.exists) throw new Error("Shared company Firestore document not found; no email sent.");
  const data=snap.data()||{}, now=new Date(), period=bounds(now,test);
  const trips=(data.trips||[]).filter(x=>included(x,period));
  const expenses=(data.expenses||[]).filter(x=>included(x,period));
  const adjustments=(data.adjustments||[]).filter(x=>included(x,period));
  const income=sum(trips,x=>x.income), tripCosts=sum(trips,x=>Number(x.fuel||0)+Number(x.otherCost||0));
  const otherExpenses=sum(expenses,x=>x.amount), driverPay=sum(trips,x=>x.driverPay);
  const vehicles=(data.vehicles||[]).map(v=>{
    const rows=trips.filter(t=>t.vehicleId===v.id), vi=sum(rows,x=>x.income), costs=sum(rows,x=>Number(x.fuel||0)+Number(x.otherCost||0))+sum(expenses.filter(x=>x.vehicleId===v.id),x=>x.amount), pay=sum(rows,x=>x.driverPay);
    return {name:v.name||v.id,trips:rows.length,income:vi,costs,driverPay:pay,profit:vi-costs-pay};
  }).filter(v=>v.trips||v.costs);
  const drivers=(data.drivers||[]).map(v=>{
    const earned=sum(trips.filter(t=>t.driverId===v.id),x=>x.driverPay), tx=adjustments.filter(a=>a.driverId===v.id);
    const advances=sum(tx.filter(a=>a.type==="advance"),x=>x.amount), deductions=sum(tx.filter(a=>a.type==="deduction"),x=>x.amount), paid=sum(tx.filter(a=>a.type==="payment"),x=>x.amount);
    return {name:v.name||v.id,earned,advances,deductions,paid,balance:earned-advances-deductions-paid};
  }).filter(v=>v.earned||v.advances||v.deductions||v.paid);
  const cutoffLabel=period.cutoff.toLocaleString("en-GB",{timeZone:TZ,dateStyle:"medium",timeStyle:"short"});
  const report={period,cutoffLabel,trips,income,tripCosts,otherExpenses,driverPay,profit:income-tripCosts-otherExpenses-driverPay,vehicles,drivers};
  const pdf=await makePdf(report);
  if(!process.env.GMAIL_CLIENT_ID||!process.env.GMAIL_CLIENT_SECRET||!process.env.GMAIL_REFRESH_TOKEN) throw new Error("Gmail OAuth secrets are not configured; PDF generated but no email sent.");
  const auth=new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID,process.env.GMAIL_CLIENT_SECRET);
  auth.setCredentials({refresh_token:process.env.GMAIL_REFRESH_TOKEN});
  const gmail=google.gmail({version:"v1",auth});
  const subject=(test?"[TEST] ":"")+"Apex Logistic Group weekly report · "+period.from+" to "+period.to;
  const body=(test?"TEST DELIVERY using current live Firestore records. ":"Attached is the weekly fleet report. ")+
    "\nPeriod: "+period.from+" to "+period.to+"\nCut-off: "+cutoffLabel+" Kenya time"+
    "\nTrips: "+trips.length+"\nIncome: "+ksh(income)+"\nOperating costs: "+ksh(tripCosts+otherExpenses)+
    "\nDriver pay: "+ksh(driverPay)+"\nNet profit: "+ksh(report.profit)+
    "\n\nRead-only report; no fleet records were changed.";
  await gmail.users.messages.send({userId:"me",requestBody:{raw:rawMail(RECIPIENTS,subject,body,pdf)}});
  console.log(JSON.stringify({sent:true,testMode:test,recipients:RECIPIENTS,period:period.from+" to "+period.to,trips:trips.length,income,profit:report.profit}));
}
main().catch(e=>{console.error("Weekly report failed:",e.message);process.exit(1);});
