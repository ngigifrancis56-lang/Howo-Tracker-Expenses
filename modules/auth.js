import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, setPersistence, browserLocalPersistence, indexedDBLocalPersistence, signOut as fbSignOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, runTransaction, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { $, blank } from "./utils.js";

const COMPANY_DOC = ["companies","apex-logistic-group","appData","fleetledger"];
const RECORD_KEYS = ["vehicles","drivers","trips","expenses","adjustments"];

function stamp(value) {
  const n = Date.parse(value || "");
  return Number.isFinite(n) ? n : 0;
}
function mergeData(remote={}, local={}) {
  const out={...blank(),...remote,...local};
  const remoteMeta=remote?._syncMeta||{}, localMeta=local?._syncMeta||{};
  const deleted={...(remoteMeta.deleted||{})};
  for(const [key,value] of Object.entries(localMeta.deleted||{})) {
    if(!deleted[key] || stamp(value)>stamp(deleted[key])) deleted[key]=value;
  }
  for (const key of RECORD_KEYS) {
    const byId=new Map();
    for (const item of [...(remote?.[key]||[]),...(local?.[key]||[])]) {
      if (!item?.id) continue;
      const old=byId.get(item.id);
      if (!old || stamp(item.updatedAt)>stamp(old.updatedAt)) byId.set(item.id,item);
    }
    out[key]=[...byId.values()].filter(item=>stamp(deleted[key+":"+item.id])<stamp(item.updatedAt));
  }
  out._syncMeta={deleted};
  return out;
}

export function createAuth({state,getData,setData,save,render,status,startFleetChat,stopFleetChat}) {
  let sessionRun=0, sharedUnsubscribe=null, lastRemoteSignature="";
  const sharedRef=()=>doc(state.db,...COMPANY_DOC);
  function showLogin(message='') {
    $('authGate').classList.remove('hidden'); $('appMain').classList.add('app-locked');
    $('appHeader').classList.add('app-locked'); $('loginError').textContent=message;
  }
  function showApp() {
    $('authGate').classList.add('hidden'); $('appMain').classList.remove('app-locked');
    $('appHeader').classList.remove('app-locked');
  }
  function loginConfig() {
    const saved=JSON.parse(localStorage.getItem('fleetledger-firebase-config')||'null')||{};
    const cfg={apiKey:saved.apiKey||$('loginApiKey').value.trim(),authDomain:saved.authDomain||$('loginAuthDomain').value.trim()||'how-expense-tracker.firebaseapp.com',projectId:saved.projectId||$('loginProjectId').value.trim()||'how-expense-tracker',storageBucket:saved.storageBucket||$('loginBucket').value.trim()||'how-expense-tracker.firebasestorage.app',messagingSenderId:saved.messagingSenderId||$('loginSender').value.trim()||'1000360563443',appId:saved.appId||$('loginAppId').value.trim()};
    if(!cfg.apiKey||!cfg.appId){$('firebaseConfigDetails').open=true;throw new Error('For this device, enter the Firebase API key and App ID in First-time setup.');}
    if(cfg.projectId!=='how-expense-tracker') throw new Error('This app must connect to the existing How Expense Tracker Firebase project.');
    localStorage.setItem('fleetledger-firebase-config',JSON.stringify(cfg)); return cfg;
  }
  function legacyRef(uid){return doc(state.db,'users',uid,'appData','fleetledger');}
  async function loadCloud() {
    const local=getData();
    const legacySnap=await getDoc(legacyRef(state.user.uid));
    const legacy=legacySnap.exists()?legacySnap.data():{};
    await runTransaction(state.db,async tx=>{
      const sharedSnap=await tx.get(sharedRef());
      const remote=sharedSnap.exists()?sharedSnap.data():{};
      const merged=mergeData(mergeData(remote,legacy),local);
      tx.set(sharedRef(),merged);
    });
    const latest=await getDoc(sharedRef());
    if(latest.exists()) setData(mergeData(latest.data(),getData()));
    localStorage.setItem('fleetledger-data',JSON.stringify(getData()));
    localStorage.setItem('fleetledger-cloud-owner',state.user.uid);
    localStorage.removeItem('fleetledger-sync-pending');
    state.syncPending=false;
    attachSharedListener();
    render();
  }
  async function syncCloud() {
    if(!state.user||!state.db) return;
    const local=getData();
    await runTransaction(state.db,async tx=>{
      const snap=await tx.get(sharedRef());
      tx.set(sharedRef(),mergeData(snap.exists()?snap.data():{},local));
    });
    status('Synced shared company records · '+state.user.email);
  }

  const PIN_ITERATIONS=180000;
  function toBase64(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes)));}
  function fromBase64(value){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
  async function derivePinHash(pin,salt){
    if(!globalThis.crypto?.subtle) throw new Error('Secure PIN setup requires HTTPS and a modern browser.');
    const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
    return toBase64(await crypto.subtle.deriveBits({name:'PBKDF2',salt:fromBase64(salt),iterations:PIN_ITERATIONS,hash:'SHA-256'},material,256));
  }
  async function refreshMasterPinStatus(){
    const security=getData()._security||{};
    const configured=!!security.masterPin;
    $('masterPinStatus').textContent=configured
      ? 'A company master PIN is configured. The app will ask for it before each deletion. This free version is an app-level safeguard, not server-enforced security.'
      : 'No master PIN is set. Create one below before using deletion protection.';
    $('masterPinSetupFields').hidden=configured;
  }
  async function setMasterPin(pin){
    if(!/^\d{6,12}$/.test(pin)) throw new Error('Choose a PIN containing 6 to 12 digits.');
    if(getData()._security?.masterPin) throw new Error('A company master PIN is already set.');
    const salt=toBase64(crypto.getRandomValues(new Uint8Array(16)));
    const hash=await derivePinHash(pin,salt);
    getData()._security={...(getData()._security||{}),masterPin:{salt,hash,iterations:PIN_ITERATIONS,algorithm:'PBKDF2-SHA256',createdAt:new Date().toISOString(),createdBy:state.user?.email||'local user'}};
    save();
    await refreshMasterPinStatus();
  }
  async function requestDeletionAuthorization(collection,recordId){
    const security=getData()._security||{};
    const config=security.masterPin;
    if(!config){
      alert('Set the company master PIN in Settings before deleting records. No record was changed.');
      return false;
    }
    const pin=prompt('Enter the company master PIN to authorise deletion of this record:');
    if(pin===null)return false;
    if(!/^\d{6,12}$/.test(pin)){
      alert('Incorrect PIN format. No record was deleted.');
      return false;
    }
    try{
      const actual=await derivePinHash(pin,config.salt);
      let diff=actual.length^config.hash.length;
      for(let i=0;i<Math.max(actual.length,config.hash.length);i++) diff|=(actual.charCodeAt(i)||0)^(config.hash.charCodeAt(i)||0);
      if(diff!==0){alert('Incorrect master PIN. No record was deleted.');return false;}
      return true;
    }catch(err){alert((err.message||'PIN verification failed.')+' No record was deleted.');return false;}
  }
  $('masterPinForm').onsubmit=async e=>{
    e.preventDefault();
    const pin=$('masterPinInput').value,confirmPin=$('masterPinConfirm').value;
    if(pin!==confirmPin){alert('The PIN entries do not match.');return;}
    const button=$('masterPinSave');button.disabled=true;
    try{
      await setMasterPin(pin);
      $('masterPinInput').value='';$('masterPinConfirm').value='';
      alert('Company master PIN saved. Share it only with staff you trust.');
    }catch(err){alert(err.message||'Could not save the master PIN.');}
    finally{button.disabled=false;}
  };
  $('loadDeletionAudit').onclick=()=>{
    const container=$('deletionAuditList');container.replaceChildren();
    const entries=[...(getData()._deletionAudit||[])].slice(-50).reverse();
    if(!entries.length){container.textContent='No deletion history has been recorded.';return;}
    for(const entry of entries){
      const item=document.createElement('div');item.className='notice';
      const heading=document.createElement('strong');
      heading.textContent=(entry.deletedBy||'Unknown account')+' · '+new Date(entry.deletedAt).toLocaleString();
      const detail=document.createElement('p');
      detail.textContent=entry.collection+' · '+entry.label+(entry.recordDate?' · '+entry.recordDate:'');
      item.append(heading,detail);container.append(item);
    }
  };

  function attachSharedListener() {
    if(sharedUnsubscribe) sharedUnsubscribe();
    sharedUnsubscribe=onSnapshot(sharedRef(),snap=>{
      if(!snap.exists()) return;
      const remote=snap.data();
      const signature=JSON.stringify(remote);
      if(signature===lastRemoteSignature)return;
      lastRemoteSignature=signature;
      const pending=localStorage.getItem('fleetledger-sync-pending')==='1';
      const merged=mergeData(remote,getData());
      setData(merged);
      localStorage.setItem('fleetledger-data',JSON.stringify(merged));
      render();
      if(pending) syncCloud().catch(err=>status('Pending sync · saved on this device. '+err.message));
    },err=>{
      console.error('Shared live sync listener failed:',err);
      status('Cloud connected, but live updates are unavailable. '+err.message);
    });
  }
  async function prepareFirebase(cfg) {
    state.authApp=getApps().length?getApp():initializeApp(cfg);
    state.auth=getAuth(state.authApp); state.db=getFirestore(state.authApp);
    try { await setPersistence(state.auth,browserLocalPersistence); }
    catch(err){console.warn('Local auth persistence unavailable; trying IndexedDB.',err);await setPersistence(state.auth,indexedDBLocalPersistence);}
    if(!state.authUnsubscribe) state.authUnsubscribe=onAuthStateChanged(state.auth,async current=>{
      const run=++sessionRun; state.user=current;
      if(!current){state.cloudReady=false;if(sharedUnsubscribe){sharedUnsubscribe();sharedUnsubscribe=null;}stopFleetChat();showLogin();status('Not signed in · sign in to reconnect cloud sync');return;}
      status('Restoring shared company records…');
      try{
        await loadCloud();
        await refreshMasterPinStatus();
        if(run!==sessionRun||state.user?.uid!==current.uid)return;
        state.cloudReady=true;status('Connected as '+current.email+' · shared cloud sync active');
      }catch(err){
        if(run!==sessionRun||state.user?.uid!==current.uid)return;
        state.cloudReady=false;
        console.error('Cloud data could not be loaded:',err);
        status('Signed in · cloud sync unavailable; local records preserved');
      }
      if(run===sessionRun&&state.user?.uid===current.uid){showApp();startFleetChat();}
    });
  }
  $('loginForm').onsubmit=async e=>{
    e.preventDefault();const btn=$('loginButton');btn.disabled=true;btn.textContent='Signing in…';$('loginError').textContent='Connecting securely to Firebase…';
    try{await prepareFirebase(loginConfig());await signInWithEmailAndPassword(state.auth,$('loginEmail').value.trim(),$('loginPassword').value);}
    catch(err){const messages={'auth/invalid-credential':'Email or password is incorrect.','auth/user-not-found':'No account exists for this email.','auth/wrong-password':'Incorrect password.','auth/invalid-email':'Enter a valid email address.','auth/network-request-failed':'Connection problem. Check your internet connection.','auth/too-many-requests':'Too many attempts. Wait a little while.','auth/unauthorized-domain':'Add ngigifrancis56-lang.github.io under Firebase Authentication → Settings → Authorised domains.','auth/api-key-not-valid.-please-pass-a-valid-api-key.':'The Firebase API key is missing or incorrect.'};$('loginError').textContent=messages[err.code]||err.message||'Sign-in failed.';console.error('Sign-in error:',err);}
    finally{btn.disabled=false;btn.textContent='Sign in';}
  };
  $('createAccountButton').onclick=async()=>{
    try{await prepareFirebase(loginConfig());const email=$('loginEmail').value.trim(),password=$('loginPassword').value;if(!email||password.length<6)throw new Error('Enter an email and a password of at least 6 characters.');$('loginError').textContent='Creating account…';await createUserWithEmailAndPassword(state.auth,email,password);}
    catch(err){$('loginError').textContent=err.message;}
  };
  $('connectFirebase').onclick=async()=>{
    try{const cfg={apiKey:$('fbApiKey').value.trim(),authDomain:$('fbAuthDomain').value.trim(),projectId:$('fbProjectId').value.trim(),storageBucket:$('fbBucket').value.trim(),messagingSenderId:$('fbSender').value.trim(),appId:$('fbAppId').value.trim()};if(!cfg.apiKey||!cfg.projectId||!cfg.appId)throw new Error('Enter API key, Project ID and App ID.');if(cfg.projectId!=='how-expense-tracker')throw new Error('Use the existing How Expense Tracker Firebase project.');localStorage.setItem('fleetledger-firebase-config',JSON.stringify(cfg));await prepareFirebase(cfg);alert('Firebase settings saved. Sign in to connect shared company records.');}
    catch(err){alert(err.message);}
  };
  $('signOut').onclick=async()=>{if(state.auth)await fbSignOut(state.auth);state.user=null;state.cloudReady=false;if(sharedUnsubscribe){sharedUnsubscribe();sharedUnsubscribe=null;}stopFleetChat();showLogin('You have signed out.');};
  async function reconnectCloud(){if(!state.user||!state.db)return;await loadCloud();state.cloudReady=true;status('Connected as '+(state.user.email||'fleet user')+' · shared cloud sync active');}
  function initialize(){
    try{const c=JSON.parse(localStorage.getItem('fleetledger-firebase-config')||'null');if(c){$('fbApiKey').value=c.apiKey||'';$('fbAuthDomain').value=c.authDomain||'';$('fbProjectId').value=c.projectId||'';$('fbBucket').value=c.storageBucket||'';$('fbSender').value=c.messagingSenderId||'';$('fbAppId').value=c.appId||'';status('Checking your saved Firebase session…');prepareFirebase(c).catch(err=>{state.cloudReady=false;console.error('Firebase init failed:',err);showLogin('Could not initialise Firebase: '+err.message);status('Firebase unavailable · local records preserved');});}else showLogin('Connect Firebase and sign in to access your fleet records.');}
    catch(err){showLogin('Saved Firebase settings could not be read: '+err.message);console.error(err);}
  }
  return {showLogin,showApp,loginConfig,prepareFirebase,syncCloud,loadCloud,reconnectCloud,requestDeletionAuthorization,refreshMasterPinStatus,initialize};
}
