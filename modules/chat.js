import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { $ } from "./utils.js";
export function createChat({state}) {
  let unsubscribe=null, sending=false, selectedImage=null;
  const MAX_IMAGE_BYTES=5*1024*1024;
  function stopFleetChat(){if(unsubscribe){unsubscribe();unsubscribe=null}state.chatUnsubscribe=null}
  function clearSelectedImage(){
    selectedImage=null;
    const input=$('chatImageInput'),preview=$('chatImagePreview');
    if(input)input.value='';
    if(preview){preview.replaceChildren();preview.classList.add('hidden')}
  }
  function showImagePreview(file){
    const preview=$('chatImagePreview');preview.replaceChildren();
    const image=document.createElement('img');image.alt='Selected image preview';image.src=URL.createObjectURL(file);
    image.onload=()=>URL.revokeObjectURL(image.src);
    const name=document.createElement('span');name.textContent=file.name;
    const remove=document.createElement('button');remove.type='button';remove.className='btn danger small';remove.textContent='Remove';remove.onclick=clearSelectedImage;
    preview.append(image,name,remove);preview.classList.remove('hidden');
  }
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
        const body=document.createElement('div');body.className='chat-body';if(m.text)body.textContent=m.text;item.append(meta);
        if(m.imageUrl){const image=document.createElement('img');image.className='chat-image';image.src=m.imageUrl;image.alt='Image shared by '+(m.senderEmail||'fleet member');image.loading='lazy';image.tabIndex=0;image.title='Open image';image.onclick=()=>window.open(m.imageUrl,'_blank','noopener');image.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.open(m.imageUrl,'_blank','noopener')}};item.append(image)}
        if(m.text)item.append(body);
        if(mine){const actions=document.createElement('div');actions.className='actions';actions.style.marginTop='7px';
          if(m.text){const edit=document.createElement('button');edit.type='button';edit.className='btn secondary';edit.textContent='Edit';edit.onclick=async()=>{let revised=prompt('Edit your message:',m.text||'');if(revised===null)return;revised=revised.trim();if(!revised){alert('Message cannot be empty.');return}if(revised.length>2000){alert('Message must be 2,000 characters or fewer.');return}try{await updateDoc(doc(state.db,'fleetChat',d.id),{text:revised,edited:true,updatedAt:serverTimestamp()})}catch(err){alert('Could not edit message: '+err.message)}};actions.append(edit)}
          const del=document.createElement('button');del.type='button';del.className='btn danger';del.textContent='Delete';del.onclick=async()=>{if(!confirm('Delete this message permanently?'))return;try{await deleteDoc(doc(state.db,'fleetChat',d.id));if(m.imagePath){try{await deleteObject(ref(getStorage(state.authApp),m.imagePath))}catch(storageErr){console.warn('Image cleanup failed:',storageErr)}}}catch(err){alert('Could not delete message: '+err.message)}};actions.append(del);item.append(actions);
        }box.append(item);
      });
      box.scrollTop=box.scrollHeight;$('chatStatus').textContent='Live · '+snap.size+' recent messages';
    },err=>{$('chatStatus').textContent='Chat unavailable';console.error('Fleet chat listener:',err);$('chatMessages').textContent='Could not load chat. Check Firebase configuration and Firestore chat rules.'});
    state.chatUnsubscribe=unsubscribe;
  }
  const imageInput=$('chatImageInput');
  if(imageInput)imageInput.onchange=()=>{
    const file=imageInput.files?.[0];if(!file){clearSelectedImage();return}
    if(!file.type.startsWith('image/')){alert('Please choose an image file.');clearSelectedImage();return}
    if(file.size>MAX_IMAGE_BYTES){alert('Please choose an image smaller than 5 MB.');clearSelectedImage();return}
    selectedImage=file;showImagePreview(file);
  };
  $('chatForm').onsubmit=async e=>{
    e.preventDefault();const message=$('chatInput').value.trim(),file=selectedImage;
    if((!message&&!file)||!state.user||!state.db||sending)return;
    sending=true;$('chatSend').disabled=true;if(imageInput)imageInput.disabled=true;
    try{
      let imageUrl='',imagePath='';
      if(file){
        $('chatStatus').textContent='Uploading image…';
        const storage=getStorage(state.authApp),safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-90)||'image';
        imagePath='fleetChat/'+state.user.uid+'/'+Date.now()+'-'+safeName;
        const imageRef=ref(storage,imagePath);
        await uploadBytes(imageRef,file,{contentType:file.type,customMetadata:{uploadedBy:state.user.uid}});
        imageUrl=await getDownloadURL(imageRef);
      }
      await addDoc(collection(state.db,'fleetChat'),{text:message,senderUid:state.user.uid,senderEmail:state.user.isAnonymous?'Fleet member':(state.user.email||'Fleet member'),createdAt:serverTimestamp(),edited:false,...(imageUrl?{imageUrl,imagePath}: {})});
      $('chatInput').value='';clearSelectedImage();
    }catch(err){alert('Message could not be sent: '+err.message);$('chatStatus').textContent='Send failed · check Firebase Storage setup and rules'}
    finally{sending=false;$('chatSend').disabled=false;if(imageInput)imageInput.disabled=false}
  };
  return {startFleetChat,stopFleetChat};
}
