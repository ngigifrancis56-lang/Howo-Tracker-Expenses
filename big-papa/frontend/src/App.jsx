import { useState } from 'react';
import { Truck, LockKeyhole, Mail, UserRound, ArrowRight, ShieldCheck } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';
export default function App() {
  const [mode,setMode]=useState('login');
  const [form,setForm]=useState({fullName:'',email:'',password:''});
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), [session,setSession]=useState(null);
  const update=(e)=>setForm({...form,[e.target.name]:e.target.value});
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const res=await fetch(API+'/api/auth/'+(mode==='login'?'login':'register'),{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)
      });
      const data=await res.json();
      if(!res.ok) throw new Error(data.message || data.detail || 'Unable to continue. Check your details.');
      setSession(data); 
    } catch(err) { setError(err.message || 'Cannot reach Big Papa server.'); }
    finally { setBusy(false); }
  }
  if(session) return <main className="shell"><section className="welcome"><div className="brand"><span className="mark"><Truck/></span><span>BIG PAPA<small>FLEET MANAGEMENT</small></span></div><div className="welcome-card"><span className="eyebrow">IDENTITY VERIFIED</span><h1>Welcome, {session.user.fullName.split(' ')[0]}.</h1><p>Your Big Papa account is ready. This is the first authentication milestone; fleet modules are being built next.</p><div className="account"><ShieldCheck/><div><b>{session.user.role}</b><small>{session.user.email}</small></div></div><button className="secondary" onClick={()=>setSession(null)}>Sign out of preview</button></div><footer>© Big Papa {new Date().getFullYear()}</footer></section></main>;
  return <main className="shell"><section className="visual"><div className="brand"><span className="mark"><Truck/></span><span>BIG PAPA<small>FLEET MANAGEMENT</small></span></div><div className="visual-copy"><span className="eyebrow">APEX LOGISTIC GROUP</span><h1>Every trip.<br/>Every shilling.<br/><em>Under control.</em></h1><p>A smarter command centre for your fleet, drivers and daily operations.</p></div><div className="visual-foot"><span>BUILT FOR THE ROAD AHEAD</span><span>KENYA · KES</span></div></section><section className="panel"><div className="form-wrap"><span className="eyebrow">YOUR FLEET. YOUR NUMBERS.</span><h2>{mode==='login'?'Welcome back':'Create your account'}</h2><p className="muted">{mode==='login'?'Sign in to continue to your fleet workspace.':'Register to get started with Big Papa.'}</p><form onSubmit={submit}>{mode==='register'&&<label>Full name<div className="field"><UserRound/><input name="fullName" value={form.fullName} onChange={update} placeholder="Your full name" required maxLength="120"/></div></label>}<label>Email address<div className="field"><Mail/><input name="email" type="email" value={form.email} onChange={update} placeholder="you@company.com" required/></div></label><label>Password<div className="field"><LockKeyhole/><input name="password" type="password" value={form.password} onChange={update} placeholder="At least 10 characters" required minLength="10"/></div></label>{error&&<div className="error">{error}</div>}<button className="primary" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}<ArrowRight size={18}/></button></form><p className="switch">{mode==='login'?'New to Big Papa?':'Already registered?'} <button onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?'Create an account':'Sign in'}</button></p><div className="secure"><ShieldCheck size={16}/> Protected account access</div></div><footer>© Big Papa {new Date().getFullYear()} · Apex Logistic Group</footer></section></main>;
}
