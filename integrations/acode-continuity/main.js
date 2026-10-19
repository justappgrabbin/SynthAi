// SYNTHAI CONTINUITY plugin for Acode / Cynthia Acode.
// Uses the official Acode lifecycle and active CodeMirror editor APIs.
// No background keystroke interception. Only explicitly approved transfers.
(() => {
  const ID = "app.synthai.continuity.acode";
  const BASE = "http://127.0.0.1:4183";
  const commands = [
    ["synthai-continuity-save-editor", "Synthia: Address current editor file", saveEditor],
    ["synthai-continuity-open-artifact", "Synthia: Open file from Continuity", openArtifact],
    ["synthai-continuity-add-note", "Synthia: Add a development checkpoint", addNote],
    ["synthai-continuity-projects", "Synthia: Show project goals", showProjects],
  ];
  let key = "";
  function ensureKey() {
    if (!key) key = (prompt("SYNTHAI CONTINUITY access key from the Android companion:") || "").trim();
    if (!/^[a-f0-9]{64}$/.test(key)) { key = ""; throw Error("A valid local companion key is required"); }
    return key;
  }
  function notify(value) { try { if(typeof window.toast==='function')window.toast(value,3800); else alert(value); } catch { alert(value); } }
  async function api(path,{method="GET",body=null,binary=false}={}) {
    const access=ensureKey();
    const headers={"x-synthia-access-key":access};
    let payload;
    if(body!=null) {
      if(body instanceof ArrayBuffer || body instanceof Uint8Array)payload=body;
      else {headers["Content-Type"]="application/json";payload=JSON.stringify(body);}
    }
    const url=BASE+path;
    // Cordova native HTTP bypasses file:// WebView CORS; Acode has this when
    // its cordova-plugin-advanced-http is available on the installed build.
    const native=window.cordova?.plugin?.http;
    if(native?.sendRequest) {
      const result=await new Promise((resolve,reject)=>{
        native.sendRequest(url,{method,headers,data:payload,responseType:binary?"arraybuffer":"text",
          serializer:typeof payload==="string"?"utf8":"raw"},resolve,reject);
      });
      if(binary)return result.data;
      return typeof result.data==="string"?JSON.parse(result.data):result.data;
    }
    const result=await fetch(url,{method,headers,body:payload});
    if(!result.ok) {if(result.status===401)key="";throw Error("Continuity returned HTTP "+result.status);}
    return binary?await result.arrayBuffer():await result.json();
  }
  function activeText() {
    const manager=window.editorManager;
    const view=manager?.editor;
    const filename=manager?.activeFile?.filename||manager?.activeFile?.name||"acode-untitled.txt";
    if(!view?.state?.doc)throw Error("No active Acode text editor");
    return {filename:String(filename),text:view.state.doc.toString()};
  }
  async function uploadBytes(file) {
    const bytes=new TextEncoder().encode(file.text);
    const size=bytes.byteLength;
    if(size>5*1024*1024)throw Error("Editor text larger than 5 MB: use Continuity's phone file picker.");
    const project=(prompt("GitHub repository for this file (owner/name, or blank to classify later):","")||"").trim();
    const start=await api("/api/companion/library/start",{method:"POST",body:{name:file.filename,size,
      project:project||null,originalSource:"acode-explicit-editor",mime:"text/plain"}});
    for(let offset=0;offset<size;offset+=start.chunkSize) {
      await api("/api/companion/library/chunk?uploadId="+encodeURIComponent(start.uploadId),{
        method:"POST",body:bytes.slice(offset,offset+start.chunkSize)
      });
    }
    const result=await api("/api/companion/library/complete",{method:"POST",body:{uploadId:start.uploadId}});
    return result.artifact;
  }
  async function saveEditor() {
    try {
      const file=activeText();
      if(!file.text.length)throw Error("The active editor has no content");
      if(!confirm("Address and preserve a copy of "+file.filename+" in SYNTHAI CONTINUITY? Your Acode original remains unchanged."))return;
      const record=await uploadBytes(file);
      notify("Saved as "+record.address.slice(0,30)+"…");
    }catch(error){notify("Not saved: "+error.message);}
  }
  async function openArtifact() {
    try {
      const items=(await api("/api/companion/library")).items.filter(item=>
        /^(source|document|data|web)$/.test(item.kind)&&item.size<1024*1024);
      if(!items.length)return notify("No addressed text/code artifacts in Continuity yet.");
      const answer=prompt("Choose source number:\n"+items.slice(0,20).map((a,i)=>i+1+". "+a.name+" · "+(a.project||"unassigned")).join("\n"),"1");
      if(!answer)return;
      const chosen=items[Number(answer)-1];
      if(!chosen)throw Error("Choose one of the listed source numbers");
      const bytes=await api("/api/companion/library/download?address="+encodeURIComponent(chosen.address),{binary:true});
      const text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
      const FileClass=window.acode.require("EditorFile");
      new FileClass(chosen.name,{text,render:true,editable:true});
      notify("Opened addressed source copy; save back explicitly when ready.");
    }catch(error){notify("Open failed: "+error.message);}
  }
  async function addNote() {
    try {
      const value=prompt("Write the next-step checkpoint for GPT and Cynthia:");
      if(!value?.trim())return;
      const result=await api("/api/companion/events",{method:"POST",
        body:{actor:"acode",type:"checkpoint",content:value,ref:"acode-ide"}});
      notify("Continuity receipt #"+result.event.seq);
    }catch(error){notify("Checkpoint failed: "+error.message);}
  }
  async function showProjects() {
    try {
      const projects=(await api("/api/companion/repos/watched")).contexts;
      const lines=Object.entries(projects).map(([repo,c])=>repo+" · "+(c.category||"unclassified")+
        " · "+(c.progress?.percent??"?")+"% · "+(c.nextTask||"No next task recorded"));
      alert("SYNTHAI CONTINUITY\n\n"+(lines.join("\n\n")||"No tracked projects yet."));
    }catch(error){notify("Project connection failed: "+error.message);}
  }
  if(!window.acode)return;
  window.acode.setPluginInit(ID,async ()=>{
    const registry=window.acode.require("commands");
    for(const [name,description,exec] of commands)registry.addCommand({name,description,exec});
  });
  window.acode.setPluginUnmount(ID,()=>{
    const registry=window.acode.require("commands");
    for(const [name] of commands)registry.removeCommand(name);
    key="";
  });
})();