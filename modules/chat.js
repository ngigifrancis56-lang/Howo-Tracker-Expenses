import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { $ } from "./utils.js";

export function createChat({state}) {
  let unsubscribe=null, sending=false, selectedImage=null, initialSnapshot=true, popup=null, popupMessages=null, popupInput=null, unread=0;
  const MAX_IMAGE_BYTES=5*1024*1024;
  const unreadKey=()=> 'apex-chat-unread-'+(state.user?.uid||'guest');
  const visibleChat=()=>document.visibilityState==='visible' && (popup?.classList.contains('open') || $('chat')?.classList.contains('active'));
  function setUnread(value){
    unread=Math.max(0,value);
    const button=$('floatingChatButton');
    if(!button)return;
    let badge=button.querySelector('.chat-unread-badge');
    if(unread&&!badge){badge=document.createElement('b');badge.className='chat-unread-badge';badge.setAttribute('aria-label','Unread messages');button.append(badge)}
    if(badge){badge.textContent=unread>99?'99+':String(unread);badge.classList.toggle('hidden',!unread)}
    try{localStorage.setItem(unreadKey(),String(unread))}catch{}
  }
  function clearUnread(){setUnread(0)}
  function playPing(){
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
      const ctx=new Ctx(),osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(880,ctx.currentTime);
      gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.025);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.22);
      osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.24);osc.onended=()=>ctx.close();
    }catch{}
  }
  async function requestNotifications(){
    if(!('Notification' in window)){alert('This browser does not support notifications.');return}
    try{
      const permission=await Notification.requestPermission();
      const status=$('chatNotificationStatus');if(status)status.textContent=permission==='granted'?'Notifications enabled on this device.':'Notifications were not enabled. You can change this in browser settings.';
      if(permission==='granted')new Notification('Apex Logistic Group',{body:'Chat notifications are enabled on this device.',icon:'./icon-192.png'});
    }catch(err){console.warn('Notification permission request failed:',err)}
  }
  function ensurePopup(){
    if(popup)return;
    const style=document.createElement('style');style.id='apex-messenger-style';
    style.textContent=`
      .chat-unread-badge{position:absolute;right:-3px;top:-5px;min-width:21px;height:21px;padding:0 5px;border-radius:20px;background:#e53935;color:#fff;border:2px solid #fff;font-size:10px;display:grid;place-items:center;font-weight:850}
      .floating-chat{position:relative}
      .messenger-popup{position:fixed;right:22px;bottom:calc(96px + env(safe-area-inset-bottom));z-index:30;width:min(390px,calc(100vw - 28px));height:min(570px,calc(100dvh - 130px));min-height:320px;background:#fff;border:1px solid #dce5ee;border-radius:19px;box-shadow:0 18px 60px #102a4340;display:none;flex-direction:column;overflow:hidden}
      .messenger-popup.open{display:flex;animation:apex-chat-in .18s ease-out}
      @keyframes apex-chat-in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
      .messenger-head{display:flex;align-items:center;gap:10px;padding:13px 15px;background:linear-gradient(110deg,#102a43,#1769aa);color:#fff}
      .messenger-avatar{width:36px;height:36px;display:grid;place-items:center;border-radius:50%;background:#ffffff25;font-size:19px}
      .messenger-headcopy{flex:1;min-width:0}.messenger-headcopy strong{display:block;font-size:14px}.messenger-headcopy small{display:block;color:#d9eaff;font-size:11px}
      .messenger-head button{border:0;background:#ffffff20;color:#fff;border-radius:8px;width:31px;height:31px;font-size:19px;cursor:pointer}
      .messenger-body{flex:1;min-height:0;overflow:auto;padding:12px;background:#f3f6fa;display:flex;flex-direction:column;gap:9px}
      .messenger-body .chat-message{max-width:88%;padding:9px 11px;border-radius:14px;background:#fff;border:1px solid #e5ebf2;align-self:flex-start}
      .messenger-body .chat-message.mine{align-self:flex-end;background:#e5f2ff;border-color:#cde2f6}
      .messenger-body .chat-meta{font-size:10px;color:#738397;margin-bottom:4px}.messenger-body .chat-body{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}
      .messenger-body .chat-image{display:block;max-width:100%;max-height:180px;border-radius:10px;margin-top:6px}
      .messenger-body .actions{display:none!important}
      .messenger-compose{display:flex;gap:8px;padding:10px;border-top:1px solid #e8edf3;background:#fff}
      .messenger-compose textarea{flex:1;min-width:0;max-height:95px;resize:none;border:1px solid #d9e2ec;border-radius:12px;padding:10px;font:13px inherit}
      .messenger-compose button{border:0;border-radius:11px;background:#1769aa;color:#fff;font-weight:750;padding:0 15px}
      .messenger-tools{display:flex;align-items:center;justify-content:space-between;padding:7px 12px;background:#fff;border-top:1px solid #f0f2f5}
      .messenger-tools button{border:0;background:transparent;color:#1769aa;font-size:11px;font-weight:750;cursor:pointer}
      .messenger-tools span{font-size:10px;color:#77889a}
      @media(max-width:600px){.messenger-popup{right:10px;bottom:calc(84px + env(safe-area-inset-bottom));width:calc(100vw - 20px);height:min(72dvh,570px);border-radius:17px}}
      @media(prefers-reduced-motion:reduce){.messenger-popup.open{animation:none}}
    `;
    document.head.append(style);
    popup=document.createElement('section');popup.className='messenger-popup';popup.setAttribute('aria-label','Fleet live chat pop-up');popup.setAttribute('aria-live','polite');
    popup.innerHTML=`
      <header class="messenger-head"><div class="messenger-avatar">🚚</div><div class="messenger-headcopy"><strong>Apex Logistic Group</strong><small id="messengerLiveStatus">Live fleet chat</small></div><button type="button" id="messengerMinimise" aria-label="Minimise chat">−</button><button type="button" id="messengerClose" aria-label="Close chat">×</button></header>
      <div class="messenger-body" id="messengerMessages"><div class="empty">Loading messages…</div></div>
      <div class="messenger-tools"><button type="button" id="messengerFullChat">Open full chat</button><span id="chatNotificationStatus">Notifications not enabled</span><button type="button" id="messengerEnableNotifications">Enable alerts</button></div>
      <form class="messenger-compose" id="messengerForm"><textarea id="messengerInput" rows="1" maxlength="2000" placeholder="Write a message…" aria-label="Write a message"></textarea><button type="submit">Send</button></form>`;
    document.body.append(popup);
    popupMessages=popup.querySelector('#messengerMessages');popupInput=popup.querySelector('#messengerInput');
    const close=()=>popup.classList.remove('open');
    popup.querySelector('#messengerMinimise').onclick=close;popup.querySelector('#messengerClose').onclick=close;
    popup.querySelector('#messengerFullChat').onclick=()=>{close();document.querySelector('[data-tab="chat"]')?.click();clearUnread()};
    popup.querySelector('#messengerEnableNotifications').onclick=requestNotifications;
    popup.querySelector('#messengerForm').onsubmit=async e=>{
      e.preventDefault();const text=popupInput.value.trim();if(!text||!state.user||!state.db||sending)return;
      sending=true;const btn=popup.querySelector('#messengerForm button');btn.disabled=true;
      try{await addDoc(collection(state.db,'fleetChat'),{text,senderUid:state.user.uid,senderEmail:state.user.email||'Fleet member',createdAt:serverTimestamp(),edited:false});popupInput.value=''}
      catch(err){alert('Message could not be sent: '+err.message)}
      finally{sending=false;btn.disabled=false;popupInput.focus()}
    };
    popupInput.addEventListener('focus',clearUnread);
    if($('floatingChatButton'))$('floatingChatButton').addEventListener('click',()=>{popup.classList.toggle('open');if(popup.classList.contains('open')){clearUnread();popupInput.focus()}});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&popup?.classList.contains('open'))clearUnread()});
    try{setUnread(Number(localStorage.getItem(unreadKey())||0))}catch{}
    if('Notification' in window){const status=popup.querySelector('#chatNotificationStatus');status.textContent=Notification.permission==='granted'?'Notifications enabled':'Notifications not enabled'}
  }
  function stopFleetChat(){if(unsubscribe){unsubscribe();unsubscribe=null}state.chatUnsubscribe=null}
  function clearSelectedImage(){
    selectedImage=null;const input=$('chatImageInput'),preview=$('chatImagePreview');
    if(input)input.value='';if(preview){preview.replaceChildren();preview.classList.add('hidden')}
  }
  function showImagePreview(file){
    const preview=$('chatImagePreview');preview.replaceChildren();
    const image=document.createElement('img');image.alt='Selected image preview';image.src=URL.createObjectURL(file);image.onload=()=>URL.revokeObjectURL(image.src);
    const name=document.createElement('span');name.textContent=file.name;
    const remove=document.createElement('button');remove.type='button';remove.className='btn danger small';remove.textContent='Remove';remove.onclick=clearSelectedImage;
    preview.append(image,name,remove);preview.classList.remove('hidden');
  }
  function renderMessages(container,docs,compact=false){
    if(!container)return;container.replaceChildren();
    if(!docs.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='No messages yet. Start the conversation.';container.append(empty);return}
    docs.slice().reverse().forEach(d=>{
      const m=d.data(),mine=m.senderUid===state.user.uid,item=document.createElement('div');item.className='chat-message'+(mine?' mine':'');
      const meta=document.createElement('div');meta.className='chat-meta';const date=m.createdAt?.toDate?m.createdAt.toDate().toLocaleString():'Sending…';meta.textContent=(m.senderEmail||'Fleet member')+' · '+date+(m.edited?' · edited':'');item.append(meta);
      if(m.imageUrl){const image=document.createElement('img');image.className='chat-image';image.src=m.imageUrl;image.alt='Image shared by '+(m.senderEmail||'fleet member');image.loading='lazy';image.onclick=()=>window.open(m.imageUrl,'_blank','noopener');item.append(image)}
      if(m.text){const body=document.createElement('div');body.className='chat-body';body.textContent=m.text;item.append(body)}
      if(mine&&!compact){
        const actions=document.createElement('div');actions.className='actions';actions.style.marginTop='7px';
        if(m.text){const edit=document.createElement('button');edit.type='button';edit.className='btn secondary';edit.textContent='Edit';edit.onclick=async()=>{let revised=prompt('Edit your message:',m.text||'');if(revised===null)return;revised=revised.trim();if(!revised||revised.length>2000){alert('Enter a message of 1–2,000 characters.');return}try{await updateDoc(doc(state.db,'fleetChat',d.id),{text:revised,edited:true,updatedAt:serverTimestamp()})}catch(err){alert('Could not edit message: '+err.message)}};actions.append(edit)}
        const del=document.createElement('button');del.type='button';del.className='btn danger';del.textContent='Delete';del.onclick=async()=>{if(!confirm('Delete this message permanently?'))return;try{await deleteDoc(doc(state.db,'fleetChat',d.id));if(m.imagePath){try{await deleteObject(ref(getStorage(state.authApp),m.imagePath))}catch(storageErr){console.warn('Image cleanup failed:',storageErr)}}}catch(err){alert('Could not delete message: '+err.message)}};actions.append(del);item.append(actions);
      }
      container.append(item);
    });
    container.scrollTop=container.scrollHeight;
  }
  function notifyNewMessage(message){
    playPing();
    if('Notification' in window&&Notification.permission==='granted'){
      const title=message.senderEmail||'Fleet member',body=message.text||(message.imageUrl?'Sent a photo':'New fleet chat message');
      if(navigator.serviceWorker?.controller){
        navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,{body,icon:'./icon-192.png',badge:'./icon-192.png',tag:'apex-fleet-chat',renotify:true,data:{url:'./'}})).catch(()=>new Notification(title,{body,icon:'./icon-192.png'}));
      }else new Notification(title,{body,icon:'./icon-192.png'});
    }
  }
  function startFleetChat(){
    if(!state.user||!state.db)return;
    ensurePopup();stopFleetChat();initialSnapshot=true;$('chatStatus').textContent='Connecting…';
    const q=query(collection(state.db,'fleetChat'),orderBy('createdAt','desc'),limit(100));
    unsubscribe=onSnapshot(q,snap=>{
      const docs=snap.docs;renderMessages($('chatMessages'),docs,false);renderMessages(popupMessages,docs,true);
      $('chatStatus').textContent='Live · '+snap.size+' recent messages';
      if(popup){const live=popup.querySelector('#messengerLiveStatus');if(live)live.textContent='Live · '+snap.size+' recent messages'}
      if(initialSnapshot){initialSnapshot=false;return}
      for(const change of snap.docChanges()){
        if(change.type!=='added')continue;
        const m=change.doc.data();if(m.senderUid===state.user.uid)continue;
        if(visibleChat())clearUnread();else{setUnread(unread+1);notifyNewMessage(m)}
      }
    },err=>{$('chatStatus').textContent='Chat unavailable';console.error('Fleet chat listener:',err);$('chatMessages').textContent='Could not load chat. Check Firebase configuration and Firestore chat rules.'});
    state.chatUnsubscribe=unsubscribe;
  }
  const imageInput=$('chatImageInput');
  if(imageInput)imageInput.onchange=()=>{const file=imageInput.files?.[0];if(!file){clearSelectedImage();return}if(!file.type.startsWith('image/')){alert('Please choose an image file.');clearSelectedImage();return}if(file.size>MAX_IMAGE_BYTES){alert('Please choose an image smaller than 5 MB.');clearSelectedImage();return}selectedImage=file;showImagePreview(file)};
  $('chatForm').onsubmit=async e=>{
    e.preventDefault();const message=$('chatInput').value.trim(),file=selectedImage;
    if((!message&&!file)||!state.user||!state.db||sending)return;
    sending=true;$('chatSend').disabled=true;if(imageInput)imageInput.disabled=true;
    try{
      let imageUrl='',imagePath='';
      if(file){$('chatStatus').textContent='Uploading image…';const storage=getStorage(state.authApp),safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-90)||'image';imagePath='fleetChat/'+state.user.uid+'/'+Date.now()+'-'+safeName;const imageRef=ref(storage,imagePath);await uploadBytes(imageRef,file,{contentType:file.type,customMetadata:{uploadedBy:state.user.uid}});imageUrl=await getDownloadURL(imageRef)}
      await addDoc(collection(state.db,'fleetChat'),{text:message,senderUid:state.user.uid,senderEmail:state.user.email||'Fleet member',createdAt:serverTimestamp(),edited:false,...(imageUrl?{imageUrl,imagePath}:{})});
      $('chatInput').value='';clearSelectedImage();
    }catch(err){alert('Message could not be sent: '+err.message);$('chatStatus').textContent='Send failed · check Firebase Storage setup and rules'}
    finally{sending=false;$('chatSend').disabled=false;if(imageInput)imageInput.disabled=false}
  };
  return {startFleetChat,stopFleetChat};
}
