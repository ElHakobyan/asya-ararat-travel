/* AI travel assistant: talks to the Supabase Edge Function "chat". Hidden until the database is connected (config.js). */
(function(){const CHAT_URL=CFG.chatUrl||(CFG.url?CFG.url+'/functions/v1/chat':'');const DEMO=!!(CFG.demo&&window.DEMO_REPLY);if(!DEMO&&(!CHAT_URL||!CFG.anonKey))return;
const box=document.getElementById('chat'),fab=document.getElementById('chatFab'),panel=document.getElementById('chatPanel'),log=document.getElementById('chatLog'),form=document.getElementById('chatForm'),input=document.getElementById('chatInput'),chips=document.getElementById('chatChips'),sendBtn=document.getElementById('chatSend'),langSel=document.getElementById('lang');
box.hidden=false;
let history=[],busy=false,hello=null,session='';
try{session=sessionStorage.getItem('asya-chat-session')||'';if(!session){session=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2);sessionStorage.setItem('asya-chat-session',session)}}catch(e){session=String(Date.now())}
const T=()=>dictionary[langSel.value]||dictionary.en;
function applyLabels(){const d=T();fab.setAttribute('aria-label',d.chatOpen);document.getElementById('chatX').setAttribute('aria-label',d.chatClose);input.placeholder=d.chatPh;if(hello)hello.textContent=d.chatHello}
function add(text,cls){const m=document.createElement('div');m.className='msg '+cls;m.textContent=text;log.appendChild(m);log.scrollTop=log.scrollHeight;return m}
function open(){panel.hidden=false;fab.setAttribute('aria-expanded','true');if(!hello){hello=add(T().chatHello,'bot')}applyLabels();setTimeout(()=>input.focus(),50)}
function close(){panel.hidden=true;fab.setAttribute('aria-expanded','false');fab.focus()}
fab.addEventListener('click',()=>panel.hidden?open():close());
document.getElementById('chatX').addEventListener('click',close);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close()});
langSel.addEventListener('change',applyLabels);
chips.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>send(T()[b.dataset.q])));
form.addEventListener('submit',e=>{e.preventDefault();const t=input.value.trim();if(t){input.value='';send(t)}});
async function send(text){if(busy||!text)return;busy=true;sendBtn.disabled=true;chips.hidden=true;add(text,'me');history.push({role:'user',content:text});const wait=add(T().chatTyping,'bot typing');
try{if(DEMO){const rep=await window.DEMO_REPLY(text,history);wait.remove();add(rep,'bot');history.push({role:'assistant',content:rep});return}
const r=await fetch(CHAT_URL,{method:'POST',headers:Object.assign({'Content-Type':'application/json'},dbHeaders()),body:JSON.stringify({messages:history.slice(-20),session:session})});const j=await r.json().catch(()=>({}));wait.remove();
if(j&&typeof j.reply==='string'&&j.reply){add(j.reply,'bot');history.push({role:'assistant',content:j.reply})}else{throw new Error('empty')}}
catch(err){wait.remove();const m=add(T().chatError+' ','bot');const a=document.createElement('a');a.href='https://wa.me/'+WA_NUMBER;a.target='_blank';a.rel='noopener';a.textContent='WhatsApp';m.appendChild(a);history.pop()}
finally{busy=false;sendBtn.disabled=false;input.focus()}}
applyLabels()})();