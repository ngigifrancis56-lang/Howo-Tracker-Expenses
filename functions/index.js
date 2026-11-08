const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const crypto = require("node:crypto");

initializeApp();
const db = getFirestore();

const COMPANY = ["companies", "apex-logistic-group"];
const APP_DATA = [...COMPANY, "appData", "fleetledger"];
const SECURITY = [...COMPANY, "security"];
const RECORD_KEYS = ["vehicles", "drivers", "trips", "expenses", "adjustments"];
const AUTH_WINDOW_MS = 2 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_DOCUMENT_BYTES = 900000;

const ref = (parts) => db.doc(parts.join("/"));
const requireUser = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in before continuing.");
  return request.auth;
};
const validPin = (pin) => typeof pin === "string" && /^\d{6,12}$/.test(pin);
const stamp = (value) => {
  if (value instanceof Timestamp) return value.toMillis();
  const n = Date.parse(value || "");
  return Number.isFinite(n) ? n : 0;
};

function mergeData(remote = {}, incoming = {}) {
  const out = { ...remote, ...incoming };
  const deleted = { ...(remote?._syncMeta?.deleted || {}) };
  for (const [key, value] of Object.entries(incoming?._syncMeta?.deleted || {})) {
    if (!deleted[key] || stamp(value) > stamp(deleted[key])) deleted[key] = value;
  }
  for (const key of RECORD_KEYS) {
    const byId = new Map();
    for (const item of [...(remote?.[key] || []), ...(incoming?.[key] || [])]) {
      if (!item?.id) continue;
      const old = byId.get(item.id);
      if (!old || stamp(item.updatedAt) > stamp(old.updatedAt)) byId.set(item.id, item);
    }
    out[key] = [...byId.values()].filter(item => stamp(deleted[key + ":" + item.id]) < stamp(item.updatedAt));
  }
  out._syncMeta = { ...(remote?._syncMeta || {}), ...(incoming?._syncMeta || {}), deleted };
  return out;
}

function removedRecords(before, after) {
  const removed = [];
  for (const key of RECORD_KEYS) {
    const remaining = new Set((after?.[key] || []).map(item => item?.id).filter(Boolean));
    for (const item of before?.[key] || []) {
      if (item?.id && !remaining.has(item.id)) {
        removed.push({
          collection: key,
          id: item.id,
          date: item.date || null,
          label: String(item.name || item.customer || item.category || item.material || item.vendor || item.id).slice(0, 120)
        });
      }
    }
  }
  return removed;
}

exports.getMasterPinStatus = onCall(async (request) => {
  requireUser(request);
  const snap = await ref([...SECURITY, "masterPin"]).get();
  return { configured: snap.exists };
});

exports.setMasterPin = onCall(async (request) => {
  const user = requireUser(request);
  const pin = request.data?.pin;
  if (!validPin(pin)) {
    throw new HttpsError("invalid-argument", "Choose a PIN containing 6 to 12 digits.");
  }
  const pinRef = ref([...SECURITY, "masterPin"]);
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  await db.runTransaction(async tx => {
    const existing = await tx.get(pinRef);
    if (existing.exists) {
      throw new HttpsError("already-exists", "The company master PIN has already been configured.");
    }
    tx.create(pinRef, {
      salt,
      hash,
      algorithm: "scrypt",
      createdBy: user.uid,
      createdByEmail: user.token.email || null,
      createdAt: FieldValue.serverTimestamp()
    });
  });
  return { ok: true };
});

exports.authorizeDeletion = onCall(async (request) => {
  const user = requireUser(request);
  const pin = request.data?.pin;
  if (!validPin(pin)) throw new HttpsError("invalid-argument", "Enter the 6 to 12 digit master PIN.");

  const pinRef = ref([...SECURITY, "masterPin"]);
  const attemptRef = ref([...SECURITY, "pinAttempts", user.uid]);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenRef = ref([...SECURITY, "deletionAuthorizations", token]);
  const now = Date.now();

  const authorized = await db.runTransaction(async tx => {
    const [pinSnap, attemptSnap] = await Promise.all([tx.get(pinRef), tx.get(attemptRef)]);
    if (!pinSnap.exists) throw new HttpsError("failed-precondition", "The company master PIN has not been configured yet.");
    const attempt = attemptSnap.exists ? attemptSnap.data() : {};
    if (attempt.lockedUntil && attempt.lockedUntil.toMillis() > now) {
      throw new HttpsError("resource-exhausted", "Too many incorrect PIN attempts. Try again later.");
    }
    const config = pinSnap.data();
    const actual = Buffer.from(crypto.scryptSync(pin, config.salt, 64).toString("hex"), "hex");
    const expected = Buffer.from(config.hash, "hex");
    const valid = actual.length === expected.length && crypto.timingSafeEqual(actual, expected);

    if (!valid) {
      const attempts = (attempt.lockedUntil && attempt.lockedUntil.toMillis() <= now ? 0 : attempt.attempts || 0) + 1;
      tx.set(attemptRef, {
        attempts,
        lockedUntil: attempts >= MAX_ATTEMPTS ? Timestamp.fromMillis(now + LOCK_MS) : null,
        updatedAt: FieldValue.serverTimestamp()
      });
      return false;
    }
    tx.set(attemptRef, { attempts: 0, lockedUntil: null, updatedAt: FieldValue.serverTimestamp() });
    tx.create(tokenRef, {
      uid: user.uid,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + AUTH_WINDOW_MS)
    });
    return true;
  });

  if (!authorized) {
    throw new HttpsError("permission-denied", "Incorrect master PIN. No record was deleted.");
  }
  return { authorizationToken: token, expiresInSeconds: AUTH_WINDOW_MS / 1000 };
});

exports.syncCompanyData = onCall(async (request) => {
  const user = requireUser(request);
  const payload = request.data?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpsError("invalid-argument", "A valid company data object is required.");
  }
  if (Buffer.byteLength(JSON.stringify(payload), "utf8") > MAX_DOCUMENT_BYTES) {
    throw new HttpsError("resource-exhausted", "Company data is too large for a single Firestore document.");
  }

  const companyRef = ref(APP_DATA);
  const token = typeof request.data?.authorizationToken === "string" ? request.data.authorizationToken : "";
  const tokenRef = token ? ref([...SECURITY, "deletionAuthorizations", token]) : null;
  const auditRef = ref([...COMPANY, "deletionAudit", crypto.randomUUID()]);

  return db.runTransaction(async tx => {
    const companySnap = await tx.get(companyRef);
    const before = companySnap.exists ? companySnap.data() : {};
    const merged = mergeData(before, payload);
    const removed = removedRecords(before, merged);

    if (removed.length) {
      if (!tokenRef) throw new HttpsError("permission-denied", "A master PIN authorisation is required. No records were deleted.");
      const tokenSnap = await tx.get(tokenRef);
      const authData = tokenSnap.exists ? tokenSnap.data() : null;
      if (!authData || authData.uid !== user.uid || !authData.expiresAt || authData.expiresAt.toMillis() <= Date.now()) {
        throw new HttpsError("permission-denied", "Deletion authorisation is missing or expired. No records were deleted.");
      }
    }

    tx.set(companyRef, merged);
    if (removed.length) {
      tx.delete(tokenRef);
      tx.create(auditRef, {
        deletedByUid: user.uid,
        deletedByEmail: user.token.email || null,
        deletedAt: FieldValue.serverTimestamp(),
        records: removed
      });
    }
    return { ok: true, deletedCount: removed.length };
  });
});
