import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, setPersistence, browserLocalPersistence, indexedDBLocalPersistence, signOut as fbSignOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { $, blank } from "./utils.js";

export function createAuth({state,getData,setData,render,status,startFleetChat,stopFleetChat}) {
  let sessionRun=0;

  function showLogin(message='') {
    $('authGate').classList.remove('hidden');
    $('appMain').classList.add('app-locked');
    $('appHeader').classList.add('app-locked');
    $('loginError').textContent=message;
  }
  function showApp() {
    $('authGate').classList.add('hidden');
    $('appMain').classList.remove('app-locked');
    $('appHeader').classList.remove('app-locked');
  }
  function loginConfig() {
    const saved=JSON.parse(localStorage.getItem('fleetledger-firebase-config')||'null')||{};
    const cfg={
      apiKey:saved.apiKey||$('loginApiKey').value.trim(),
      authDomain:saved.authDomain||$('loginAuthDomain').value.trim()||'how-expense-tracker.firebaseapp.com',
      projectId:saved.projectId||$('loginProjectId').value.trim()||'how-expense-tracker',
      storageBucket:saved.storageBucket||$('loginBucket').value.trim()||'how-expense-tracker.firebasestorage.app',
      messagingSenderId:saved.messagingSenderId||$('loginSender').value.trim()||'1000360563443',
      appId:saved.appId||$('loginAppId').value.trim()
    };
    if(!cfg.apiKey||!cfg.appId) {
      $('firebaseConfigDetails').open=true;
      throw new Error('For this device, enter the Firebase API key and App ID in First-time setup. The other project details are already filled in.');
    }
    if(cfg.projectId!=='how-expense-tracker') throw new Error('This app must connect to the existing How Expense Tracker Firebase project.');
    localStorage.setItem('fleetledger-firebase-config',JSON.stringify(cfg));
    return cfg;
  }

  async function syncCloud() {
    if(!state.user||!state.db) return;
    await setDoc(doc(state.db,'users',state.user.uid,'appData','fleetledger'),getData());
    localStorage.setItem('fleetledger-cloud-owner',state.user.uid);
    status('Synced to Firebase · '+state.user.email);
  }

  function hasLocalRecords(data) {
    return ['vehicles','drivers','trips','expenses','adjustments'].some(key=>Array.isArray(data?.[key])&&data[key].length>0);
  }

  async function loadCloud() {
    const snap=await getDocs(collection(state.db,'users',state.user.uid,'appData'));
    const remote=snap.docs.find(x=>x.id==='fleetledger')?.data();
    const local=getData();
    const marker=localStorage.getItem('fleetledger-cloud-owner');
    const hasPendingChanges=localStorage.getItem('fleetledger-sync-pending')==='1';

    if(remote) {
      const sameOwner=marker===state.user.uid;
      if(sameOwner&&hasPendingChanges) {
        // Preserve edits made offline before this reload; upload them rather than
        // replacing the local copy with an older cloud snapshot.
        await syncCloud();
        localStorage.removeItem('fleetledger-sync-pending');
      } else {
        const localHasRecords=hasLocalRecords(local);
        if(sameOwner||!localHasRecords) {
          setData({...blank(),...remote});
        } else {
          const useCloud=confirm('Firebase records were found for this account. OK = load the cloud records on this device. Cancel = keep this device records and upload them to the cloud.');
          if(useCloud) setData({...blank(),...remote});
          else await syncCloud();
        }
      }
    } else {
      await syncCloud();
      localStorage.removeItem('fleetledger-sync-pending');
    }

    localStorage.setItem('fleetledger-data',JSON.stringify(getData()));
    localStorage.setItem('fleetledger-cloud-owner',state.user.uid);
    render();
  }

  async function prepareFirebase(cfg) {
    state.authApp=getApps().length?getApp():initializeApp(cfg);
    state.auth=getAuth(state.authApp);
    state.db=getFirestore(state.authApp);

    // localStorage-backed persistence is more reliable across Safari tabs and
    // installed iOS web apps; IndexedDB remains the fallback.
    try {
      await setPersistence(state.auth,browserLocalPersistence);
    } catch(err) {
      console.warn('Browser local persistence unavailable; trying IndexedDB persistence.',err);
      await setPersistence(state.auth,indexedDBLocalPersistence);
    }

    if(!state.authUnsubscribe) {
      state.authUnsubscribe=onAuthStateChanged(state.auth,async current=>{
        const run=++sessionRun;
        state.user=current;

        if(!current) {
          state.cloudReady=false;
          stopFleetChat();
          showLogin();
          status('Not signed in · sign in to reconnect cloud sync');
          return;
        }

        status('Restoring your saved session…');
        try {
          await loadCloud();
          if(run!==sessionRun||state.user?.uid!==current.uid) return;
          state.cloudReady=true;
          status('Connected as '+current.email+' · cloud sync active');
        } catch(err) {
          if(run!==sessionRun||state.user?.uid!==current.uid) return;
          // A Firestore/network/rules error must not be presented as a logout.
          // Keep the authenticated user in the app with their local records.
          state.cloudReady=false;
          console.error('Firebase session restored, but cloud data could not be loaded:',err);
          status('Signed in as '+(current.email||'fleet user')+' · local mode (cloud sync unavailable)');
        }
        if(run===sessionRun&&state.user?.uid===current.uid) {
          showApp();
          startFleetChat();
        }
      });
    }
  }

  $('loginForm').onsubmit=async e=>{
    e.preventDefault();
    const btn=$('loginButton');
    btn.disabled=true;
    btn.textContent='Signing in…';
    $('loginError').textContent='Connecting securely to Firebase…';
    try {
      await prepareFirebase(loginConfig());
      await signInWithEmailAndPassword(state.auth,$('loginEmail').value.trim(),$('loginPassword').value);
    } catch(err) {
      const messages={
        'auth/invalid-credential':'Email or password is incorrect. Check both and try again.',
        'auth/user-not-found':'No account exists for this email. Use your existing account or choose Create account only if you have never registered.',
        'auth/wrong-password':'Incorrect password.',
        'auth/invalid-email':'Enter a valid email address.',
        'auth/network-request-failed':'Connection problem. Check your internet connection and try again.',
        'auth/too-many-requests':'Too many attempts. Wait a little while, then try again.',
        'auth/unauthorized-domain':'This app address is not yet authorised in Firebase. Add ngigifrancis56-lang.github.io under Authentication → Settings → Authorised domains.',
        'auth/api-key-not-valid.-please-pass-a-valid-api-key.':'The Firebase API key is missing or incorrect. Copy the Web API key from Firebase Project settings.'
      };
      $('loginError').textContent=messages[err.code]||err.message||'Sign-in failed. Please try again.';
      console.error('Apex Logistic Group sign-in error:',err);
    } finally {
      btn.disabled=false;
      btn.textContent='Sign in';
    }
  };

  $('createAccountButton').onclick=async()=>{
    try {
      await prepareFirebase(loginConfig());
      const email=$('loginEmail').value.trim(),password=$('loginPassword').value;
      if(!email||password.length<6) throw new Error('Enter an email and a password of at least 6 characters.');
      $('loginError').textContent='Creating account…';
      await createUserWithEmailAndPassword(state.auth,email,password);
    } catch(err) {
      $('loginError').textContent=err.message;
    }
  };

  $('connectFirebase').onclick=async()=>{
    try {
      const cfg={
        apiKey:$('fbApiKey').value.trim(),
        authDomain:$('fbAuthDomain').value.trim(),
        projectId:$('fbProjectId').value.trim(),
        storageBucket:$('fbBucket').value.trim(),
        messagingSenderId:$('fbSender').value.trim(),
        appId:$('fbAppId').value.trim()
      };
      if(!cfg.apiKey||!cfg.projectId||!cfg.appId) throw new Error('Enter API key, Project ID and App ID.');
      if(cfg.projectId!=='how-expense-tracker') throw new Error('Use the existing How Expense Tracker Firebase project.');
      localStorage.setItem('fleetledger-firebase-config',JSON.stringify(cfg));
      await prepareFirebase(cfg);
      alert('Firebase configuration saved. Cloud sync still requires an authenticated account.');
    } catch(err) {
      alert(err.message);
    }
  };

  $('signOut').onclick=async()=>{
    if(state.auth) await fbSignOut(state.auth);
    state.user=null;
    state.cloudReady=false;
    stopFleetChat();
    showLogin('You have signed out.');
  };

  async function reconnectCloud() {
    if(!state.user||!state.db) return;
    await loadCloud();
    state.cloudReady=true;
    status('Connected as '+(state.user.email||'fleet user')+' · cloud sync active');
  }

  function initialize() {
    try {
      const c=JSON.parse(localStorage.getItem('fleetledger-firebase-config')||'null');
      if(c) {
        $('fbApiKey').value=c.apiKey||'';
        $('fbAuthDomain').value=c.authDomain||'';
        $('fbProjectId').value=c.projectId||'';
        $('fbBucket').value=c.storageBucket||'';
        $('fbSender').value=c.messagingSenderId||'';
        $('fbAppId').value=c.appId||'';
        status('Checking your saved Firebase session…');
        prepareFirebase(c).catch(err=>{
          state.cloudReady=false;
          console.error('Firebase could not be initialised:',err);
          showLogin('Could not initialise Firebase: '+err.message);
          status('Firebase connection unavailable · your local records are preserved');
        });
      } else {
        showLogin('Connect Firebase and sign in to access your fleet records.');
      }
    } catch(err) {
      showLogin('Saved Firebase settings could not be read: '+err.message);
      console.error('Saved Firebase configuration could not be read',err);
    }
  }

  return {showLogin,showApp,loginConfig,prepareFirebase,syncCloud,loadCloud,reconnectCloud,initialize};
}
