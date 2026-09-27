const logEl = document.getElementById('log');
const form = document.getElementById('chatForm');
const msgIn = document.getElementById('msg');
const nameIn = document.getElementById('name');
const micBtn = document.getElementById('micBtn');
const voicesBtn = document.getElementById('voicesBtn');
const voicePicker = document.getElementById('voicePicker');
const voiceSelect = document.getElementById('voiceSelect');
const closeVoice = document.getElementById('closeVoice');

let voices = [];
let selectedVoiceURI = localStorage.getItem('voiceURI') || null;

function append(role, text){
  const div = document.createElement('div');
  div.className = `row ${role}`;
  const label = document.createElement('b'); label.textContent = role === 'user' ? 'You:' : 'Cynthia:';
  const content = document.createElement('p'); content.textContent = text; content.style.whiteSpace = 'pre-wrap';
  div.append(label, content);
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

async function sendMessage(text){
  append('user', text);
  const res = await fetch('/api/solo/talk/chat', {
    method: 'POST',
    headers: {'content-type':'application/json'},
    body: JSON.stringify({message: text, name: nameIn.value || ""})
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Talk is unavailable');
  append('ai', data.reply);
  speak(data.reply);
}

form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const text = msgIn.value.trim();
  if(!text) return;
  msgIn.value='';
  sendMessage(text).catch(error => append('ai', error.message));
});

// TTS
function populateVoices(){
  voices = window.speechSynthesis?.getVoices() || [];
  voiceSelect.innerHTML = voices.map(v=>{
    const sel = (v.voiceURI === selectedVoiceURI) ? 'selected' : '';
    return `<option value="${v.voiceURI}" ${sel}>${v.name} (${v.lang})</option>`;
  }).join('');
}
populateVoices();
if (window.speechSynthesis && 'onvoiceschanged' in window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = populateVoices;
}

function speak(text){
  const nativeVoice = window.SynthiaVoice || window.parent?.SynthiaVoice;
  if (nativeVoice) { nativeVoice.speak(String(text)); return; }
  if(!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  const v = voices.find(v=> v.voiceURI === selectedVoiceURI) || voices.find(v=>/female|en-US|en-GB/i.test(v.name)) || voices[0];
  if(v) u.voice = v;
  u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

voicesBtn.addEventListener('click', ()=> voicePicker.showModal());
closeVoice.addEventListener('click', ()=> voicePicker.close());
voiceSelect.addEventListener('change',()=>{
  selectedVoiceURI = voiceSelect.value;
  localStorage.setItem('voiceURI', selectedVoiceURI);
});

// STT
let rec = null;
if('webkitSpeechRecognition' in window){
  const R = window.webkitSpeechRecognition;
  rec = new R();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.continuous = false;
  rec.onresult = (e)=>{
    const txt = e.results[0][0].transcript;
    msgIn.value = txt;
    form.requestSubmit();
  };
  rec.onerror = (e)=> console.log('STT error', e);
}

micBtn.addEventListener('click', ()=>{
  if(rec){
    rec.start();
  }else{
    alert('Speech recognition not supported in this browser. Use Chrome on Android/iOS.');
  }
});

// Greeting
append('ai', "Hey — I’m Cynthia‑Talk. Ask me about Human Design, I Ching, field resonance, quantum basics, your route to success, why the messy room is driving you nuts, and how to optimize your relationship. I’ll talk back out loud. 🔊");
