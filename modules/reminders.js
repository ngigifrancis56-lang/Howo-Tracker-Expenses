const ENABLED_KEY='apex-trip-reminder-enabled';
const LAST_SHOWN_KEY='apex-trip-reminder-last-shown';
const TIME_ZONE='Africa/Nairobi';

function nairobiParts(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.map(part=>[part.type,part.value]));
}

export function initDailyTripReminder(){
  const enableButton=document.getElementById('enableTripReminder');
  const disableButton=document.getElementById('disableTripReminder');
  const status=document.getElementById('tripReminderStatus');
  if(!enableButton||!disableButton||!status)return;

  const isEnabled=()=>localStorage.getItem(ENABLED_KEY)==='1';
  const setStatus=message=>{status.textContent=message};
  const todayKey=()=>{
    const p=nairobiParts();
    return p.year+'-'+p.month+'-'+p.day;
  };

  function checkReminder(){
    if(!isEnabled())return;
    const now=nairobiParts();
    if(Number(now.hour)<19)return;
    if(localStorage.getItem(LAST_SHOWN_KEY)===todayKey())return;
    if(!('Notification' in window)){
      setStatus('This browser does not support notifications. Keep the app open and check your trips at 7:00 PM.');
      return;
    }
    if(Notification.permission!=='granted'){
      setStatus('Reminder is on, but notifications are blocked. Allow notifications in your browser settings.');
      return;
    }
    try{
      const notification=new Notification('Apex Logistic Group · Daily trip reminder',{
        body:'Have you recorded today’s trips? Open the Trips tab and update your fleet records.',
        tag:'apex-daily-trip-reminder',
        renotify:false
      });
      notification.onclick=()=>{
        window.focus();
        const tripsTab=document.querySelector('[data-tab="trips"]');
        if(tripsTab)tripsTab.click();
        notification.close();
      };
      localStorage.setItem(LAST_SHOWN_KEY,todayKey());
      setStatus('Daily reminder is active. Today’s 7:00 PM notification has been sent.');
    }catch(error){
      setStatus('Could not display the reminder. Keep the app open and check browser notification permissions.');
    }
  }

  enableButton.addEventListener('click',async()=>{
    if(!('Notification' in window)){
      setStatus('This browser does not support notifications.');
      return;
    }
    try{
      const permission=await Notification.requestPermission();
      if(permission!=='granted'){
        setStatus('Notifications were not allowed. You can enable them in your browser or device settings.');
        return;
      }
      localStorage.setItem(ENABLED_KEY,'1');
      setStatus('Reminder enabled for every day at 7:00 PM Kenya time. Keep the app open to receive it.');
      checkReminder();
    }catch(error){
      setStatus('Could not enable notifications in this browser.');
    }
  });

  disableButton.addEventListener('click',()=>{
    localStorage.removeItem(ENABLED_KEY);
    setStatus('Daily trip reminder is off.');
  });

  if(isEnabled())setStatus('Reminder enabled for every day at 7:00 PM Kenya time. Keep the app open to receive it.');
  checkReminder();
  window.setInterval(checkReminder,15000);
  window.addEventListener('focus',checkReminder);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)checkReminder();
  });
}
