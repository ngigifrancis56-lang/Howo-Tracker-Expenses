import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { $ } from "./utils.js";
export function createChat({state}) {
  let unsubscribe=null, sending=false;
  function stopFleetChat(){if(unsubscribe){unsubscribe();unsubscribe=null}state.chatUnsubscribe=null}
  function startFleetChat(){
    if(!state.user||!state.db)return;
    stopFleetChat();$('chatStatus').textContent='Connecting…';
    const q=query(collection(state.db,'fleetChat'),orderBy('createdAt','desc'),limit(100));
    unsubscribe=onSnapshot(q,snap=>{
      const box=$('chatMessages');box.replaceChildren();
      if(snap.empty){const empty=document.createElement('div');empty.className='empty';empty.textContent='No messages yet. Start the conversation.';box.append(empty)}
      else snap.docs.slice().reverse().forEach(d=>{
        const m=d.data(),mine=m.senderUid===state.user.uid,item=document.createElement('div');item.className='chat-message'+(mine?' mine':'');
        const meta=document.createElement('div');meta.className='chat-meta';const date=m.createdAt?.toDate?m.createdAt.toDate().toLocaleString():'Sending…';meta.textContent=(m.senderEmail||'Fleet member')+' · '+date+(m.edited?' · edited':'');
        const body=document.createElement('div');body.className='chat-body';body.textContent=m.text||'';item.append(meta,body);
        if(mine){const actions=document.createElement('div');actions.className='actions';actions.style.marginTop='7px';
          const edit=document.createElement('button');edit.type='button';edit.className='btn secondary';edit.textContent='Edit';
          edit.onclick=async()=>{let revised=prompt('Edit your message:',m.text||'');if(revised===null)return;revised=revised.trim();if(!revised){alert('Message cannot be empty.');return}if(revised.length>2000){alert('Message must be 2,000 characters or fewer.');return}try{await updateDoc(doc(state.db,'fleetChat',d.id),{text:revised,edited:true,updatedAt:serverTimestamp()})}catch(err){alert('Could not edit message: '+err.message)}};
          const del=document.createElement('button');del.type='button';del.className='btn danger';del.textContent='Delete';del.onclick=async()=>{if(!confirm('Delete this message permanently?'))return;try{await deleteDoc(doc(state.db,'fleetChat',d.id))}catch(err){alert('Could not delete message: '+err.message)}};
          actions.append(edit,del);item.append(actions);
        }box.append(item);
      });
      box.scrollTop=box.scrollHeight;$('chatStatus').textContent='Live · '+snap.size+' recent messages';
    },err=>{$('chatStatus').textContent='Chat unavailable';console.error('Fleet chat listener:',err);$('chatMessages').textContent='Could not load chat. Check Firebase configuration and Firestore chat rules.'});
    state.chatUnsubscribe=unsubscribe;
  }
  $('chatForm').onsubmit=async e=>{e.preventDefault();const message=$('chatInput').value.trim();if(!message||!state.user||!state.db||sending)return;sending=true;$('chatSend').disabled=true;
    try{await addDoc(collection(state.db,'fleetChat'),{text:message,senderUid:state.user.uid,senderEmail:state.user.isAnonymous?'Fleet member':(state.user.email||'Fleet member'),createdAt:serverTimestamp(),edited:false});$('chatInput').value=''}
    catch(err){alert('Message could not be sent: '+err.message)}finally{sending=false;$('chatSend').disabled=false}
  };
  return {startFleetChat,stopFleetChat};
}
