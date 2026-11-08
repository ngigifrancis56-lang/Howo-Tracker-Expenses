import { collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { $ } from "./utils.js";

const COMPANY=["companies","apex-logistic-group"];
const FIRST_ADMIN="ngigifrancis56@gmail.com";

export function createMembership({state,status}) {
  const memberRef=uid=>doc(state.db,...COMPANY,"members",uid);
  async function ensureMembership(user) {
    let snap=await getDoc(memberRef(user.uid));
    if(!snap.exists()) {
      if(user.email?.toLowerCase()===FIRST_ADMIN && user.emailVerified) {
        await user.getIdToken(true);
        await setDoc(memberRef(user.uid),{
          uid:user.uid,email:user.email,displayName:user.displayName||"",
          role:"admin",status:"active",createdAt:serverTimestamp(),
          approvedAt:serverTimestamp(),approvedBy:"verified-first-admin-bootstrap"
        });
      } else {
        await setDoc(memberRef(user.uid),{
          uid:user.uid,email:user.email||"",displayName:user.displayName||"",
          role:"staff",status:"pending",createdAt:serverTimestamp()
        });
      }
      snap=await getDoc(memberRef(user.uid));
    }
    return snap.exists()?snap.data():null;
  }
  function showAccess(message) {
    $("authGate").classList.remove("hidden");
    $("appMain").classList.add("app-locked");
    $("appHeader").classList.add("app-locked");
    $("loginError").textContent=message;
  }
  async function refreshAdminPanel() {
    const panel=$("userManagementPanel");
    if(!panel)return;
    panel.hidden=state.membership?.role!=="admin"||state.membership?.status!=="active";
    if(panel.hidden)return;
    const list=$("memberList");
    list.textContent="Loading registered accounts…";
    try {
      const snap=await getDocs(query(collection(state.db,...COMPANY,"members"),orderBy("createdAt","desc")));
      list.replaceChildren();
      if(snap.empty){list.textContent="No registered accounts yet.";return;}
      for(const memberDoc of snap.docs) {
        const m=memberDoc.data(),row=document.createElement("div");
        row.className="member-row";
        const info=document.createElement("div"),name=document.createElement("strong"),meta=document.createElement("small");
        name.textContent=m.displayName||m.email||memberDoc.id;
        meta.textContent=(m.email||"No email")+" · "+(m.role||"staff")+" · "+(m.status||"pending");
        info.append(name,meta);
        const role=document.createElement("select");
        for(const value of ["staff","manager","admin"]){const option=document.createElement("option");option.value=value;option.textContent=value[0].toUpperCase()+value.slice(1);role.append(option);}
        role.value=m.role||"staff";role.setAttribute("aria-label","Role for "+(m.email||memberDoc.id));
        const action=document.createElement("select");
        for(const value of ["pending","active","rejected","suspended"]){const option=document.createElement("option");option.value=value;option.textContent=value[0].toUpperCase()+value.slice(1);action.append(option);}
        action.value=m.status||"pending";action.setAttribute("aria-label","Account status for "+(m.email||memberDoc.id));
        const save=document.createElement("button");save.type="button";save.className="btn small";save.textContent="Save";
        save.disabled=memberDoc.id===state.user?.uid;
        save.onclick=async()=>{
          save.disabled=true;
          try {
            await updateDoc(memberRef(memberDoc.id),{role:role.value,status:action.value,updatedAt:serverTimestamp(),approvedAt:action.value==="active"?serverTimestamp():null,approvedBy:state.user.uid});
            await refreshAdminPanel();
          } catch(err){alert("Could not update account: "+err.message);save.disabled=false;}
        };
        const controls=document.createElement("div");controls.className="member-controls";controls.append(role,action,save);
        row.append(info,controls);list.append(row);
      }
    } catch(err){list.textContent="Could not load accounts: "+err.message;}
  }
  async function register(email,password,displayName,phone) {
    // The Firebase account is created by auth.js. This method only sends verification.
    if(!state.user)throw new Error("Account creation did not complete.");
    if(!state.user.emailVerified)await sendEmailVerification(state.user);
    status("Verification email sent. Verify your email, then wait for administrator approval.");
  }
  return {ensureMembership,showAccess,refreshAdminPanel,register};
}
