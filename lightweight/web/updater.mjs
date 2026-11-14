export function mountGitHubUpdater({root,native=globalThis.SynthiaAndroid,setTimer=setInterval}={}){
 if(!root)return;
 const title=document.createElement('h3');title.textContent='App updates';
 const version=document.createElement('p'),status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const check=document.createElement('button');check.className='wb-btn secondary';check.textContent='Check GitHub for updates';
 const download=document.createElement('button');download.className='wb-btn';download.textContent='Download update';download.hidden=true;
 const label=document.createElement('label'),auto=document.createElement('input');auto.type='checkbox';label.append(auto,document.createTextNode(' Check for updates daily when I open the app'));
 const note=document.createElement('p');note.textContent='Updates are optional. Download opens GitHub in your browser; Android asks you before installing. Your model and saved app data stay in place for compatible updates.';
 root.replaceChildren(title,version,status,check,download,label,note);
 function refresh(){
  if(!native?.appUpdateStatus){version.textContent='Update checks are available in the Android app.';check.disabled=true;auto.disabled=true;return;}
  try{const data=JSON.parse(native.appUpdateStatus());version.textContent='Installed: '+(data.currentVersion||'Lite');status.textContent=data.message||'';check.disabled=!!data.checking;auto.checked=data.autoCheck!==false;download.hidden=!data.update;download.textContent=data.update?'Download '+data.update.versionName:'Download update';}
  catch{status.textContent='Update information unavailable. Try again.';}
 }
 check.onclick=()=>{native.checkAppUpdates();refresh();};download.onclick=()=>native.openAppUpdate();auto.onchange=()=>{native.autoAppUpdates(auto.checked);refresh();};
 refresh();native?.maybeAppUpdates?.();setTimer(refresh,1500);return {refresh};
}
