const admin = require("firebase-admin");

const COMPANY_PATH = "companies/apex-logistic-group/appData/fleetledger";
const BUCKET = "how-expense-tracker.firebasestorage.app";
const TZ = "Africa/Nairobi";
const DAY_MS = 24 * 60 * 60 * 1000;
const SIGNED_URL_MS = 7 * DAY_MS;

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short"
  }).formatToParts(date);
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}
function dateKey(y, m, d) {
  return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}
function weekPeriod(now = new Date()) {
  const p = localParts(now);
  const dayIndex = ({Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6})[p.weekday];
  const todayUtc = new Date(Date.UTC(Number(p.year), Number(p.month)-1, Number(p.day)));
  const sunday = new Date(todayUtc);
  sunday.setUTCDate(sunday.getUTCDate() - dayIndex);
  const saturday = new Date(sunday);
  saturday.setUTCDate(saturday.getUTCDate() + 6);
  return {
    from: dateKey(sunday.getUTCFullYear(), sunday.getUTCMonth()+1, sunday.getUTCDate()),
    to: dateKey(saturday.getUTCFullYear(), saturday.getUTCMonth()+1, saturday.getUTCDate()),
    isSaturday: p.weekday === "Sat",
    today: dateKey(Number(p.year), Number(p.month), Number(p.day))
  };
}
async function signedUrl(bucket, path) {
  const [url] = await bucket.file(path).getSignedUrl({
    version: "v4", action: "read", expires: Date.now() + SIGNED_URL_MS
  });
  return url;
}
async function main() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
  if (!serviceAccount.project_id) throw new Error("Firebase service-account JSON is missing project_id.");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: BUCKET
  });
  const db = admin.firestore();
  const bucket = admin.storage().bucket();
  const ref = db.doc(COMPANY_PATH);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Shared Apex Logistic Group Firestore document not found.");
  const current = snap.data() || {};
  const period = weekPeriod();
  const force = process.env.FORCE_BACKUP === "true";
  const shouldCreate = period.isSaturday || force;
  const notes = Array.isArray(current.notes) ? current.notes : [];
  const backupId = "weekly-backup-" + period.from;
  let newBackupNote = null;

  if (shouldCreate) {
    const backupData = { ...current };
    backupData.notes = notes.filter(n => n && n.systemType !== "weekly-backup");
    const payload = {
      format: "Apex Logistic Group JSON backup",
      version: 1,
      generatedAt: new Date().toISOString(),
      timezone: TZ,
      week: { from: period.from, to: period.to },
      data: backupData
    };
    const path = "fleetBackups/" + period.from + "_to_" + period.to + ".json";
    await bucket.file(path).save(Buffer.from(JSON.stringify(payload, null, 2)), {
      resumable: false,
      metadata: {
        contentType: "application/json",
        cacheControl: "private, no-store",
        metadata: { company: "apex-logistic-group", weekFrom: period.from, weekTo: period.to }
      }
    });
    newBackupNote = {
      id: backupId,
      title: "Weekly JSON backup · " + period.from + " to " + period.to,
      details: "Automatic full-company backup created on Saturday at 7:05 PM Kenya time. It contains the fleet records and ordinary notes as they stood when the backup ran. Download the JSON file below and use Settings → Backup & restore if you ever need to restore it.",
      date: period.to,
      category: "Backup",
      systemType: "weekly-backup",
      backupPath: path,
      periodFrom: period.from,
      periodTo: period.to,
      generatedAt: new Date().toISOString()
    };
  }

  // Refresh short-lived download links daily so historical weekly backups remain
  // downloadable without making the Storage objects public.
  const backupNotes = notes.filter(n => n && n.systemType === "weekly-backup");
  const urlUpdates = new Map();
  for (const note of backupNotes) {
    if (note.backupPath) urlUpdates.set(note.id, await signedUrl(bucket, note.backupPath));
  }
  if (newBackupNote) urlUpdates.set(newBackupNote.id, await signedUrl(bucket, newBackupNote.backupPath));

  await db.runTransaction(async tx => {
    const latestSnap = await tx.get(ref);
    if (!latestSnap.exists) throw new Error("Shared company data disappeared during backup.");
    const latestNotes = Array.isArray(latestSnap.data().notes) ? latestSnap.data().notes : [];
    const byId = new Map(latestNotes.map(n => [n.id, n]));
    for (const [id, url] of urlUpdates) {
      const old = byId.get(id);
      if (old) byId.set(id, { ...old, backupUrl: url, updatedAt: new Date().toISOString() });
    }
    if (newBackupNote) {
      const existing = byId.get(newBackupNote.id) || {};
      byId.set(newBackupNote.id, {
        ...existing, ...newBackupNote,
        backupUrl: urlUpdates.get(newBackupNote.id),
        updatedAt: new Date().toISOString()
      });
    }
    tx.set(ref, { notes: [...byId.values()] }, { merge: true });
  });

  console.log(JSON.stringify({
    success: true,
    action: newBackupNote ? "created-and-refreshed-links" : "refreshed-links",
    week: period.from + " to " + period.to,
    backups: urlUpdates.size
  }));
}
main().catch(error => {
  console.error("Weekly JSON backup failed:", error);
  process.exit(1);
});
