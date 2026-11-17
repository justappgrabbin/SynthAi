(function () {
  const open = new Promise((resolve, reject) => {
    let q = indexedDB.open("independent-binary-v1", 1);
    q.onupgradeneeded = () => q.result.createObjectStore("files", { keyPath: "id" });
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
  async function tx(mode, fn) {
    let db = await open;
    return new Promise((resolve, reject) => {
      let t = db.transaction("files", mode),
        q = fn(t.objectStore("files"));
      t.oncomplete = () => resolve(q.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }
  const el = (id) => document.getElementById(id);
  let items = [];
  async function reload() {
    items = await tx("readonly", (s) => s.getAll());
    el("vaultlist").replaceChildren(
      ...items.map((x) => {
        let o = document.createElement("option");
        o.value = x.id;
        o.textContent = x.path + " · " + x.info.format + " · " + x.info.size + " bytes";
        return o;
      }),
    );
    el("vaultstatus").textContent = items.length + " stored files";
  }
  async function intake(files) {
    for (const f of files) {
      try {
        let blob = f.slice(),
          b = new Uint8Array(await blob.arrayBuffer()),
          info = Universal.inspect(b),
          id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random();
        let path = f.webkitRelativePath || f.name;
        await tx("readwrite", (s) => s.add({ id, path, blob, info }));
        if (info.format === "text") {
          records.push({
            id: "Vault/" + id,
            archive: "Imported",
            path,
            size: b.length,
            text: new TextDecoder().decode(b),
          });
          save();
          refresh();
        }
        el("vaultstatus").textContent = "Stored " + path;
      } catch (e) {
        log({ file: f.name, error: e.message });
        el("vaultstatus").textContent = "Import failure: " + f.name + " " + e.message;
      }
    }
    await reload();
  }
  el("import").onchange = (e) => intake(e.target.files).catch((e) => log(e.message));
  el("directory").onchange = el("import").onchange;
  function selectedBlob() {
    let x = items.find((v) => v.id === el("vaultlist").value);
    if (!x) throw Error("Select a stored file");
    return x;
  }
  el("vaultlist").onchange = () => {
    let x = selectedBlob();
    el("vaultout").textContent = JSON.stringify(x.info, null, 2);
  };
  el("vaultdownload").onclick = () => {
    try {
      let x = selectedBlob();
      download(x.path.split("/").pop(), x.blob, "application/octet-stream");
    } catch (e) {
      log(e.message);
    }
  };
  function show(x) {
    el("vaultout").textContent = JSON.stringify(
      x,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2,
    );
  }
  el("rvrun").onclick = async () => {
    try {
      show(Universal.rv32(new Uint8Array(await selectedBlob().blob.arrayBuffer())));
    } catch (e) {
      show({ error: e.message });
    }
  };
  el("rvsample").onclick = () =>
    show(
      Universal.rv32(
        new Uint8Array([0x13, 0x05, 0x70, 0x00, 0x13, 0x05, 0x55, 0x00, 0x73, 0, 0x10, 0]),
      ),
    );
  el("wasmrun").onclick = async () => {
    try {
      if (!el("wasmtrust").checked)
        throw Error("Explicit trust required: native WASM can block this page indefinitely");
      show(
        await Universal.wasm(
          await selectedBlob().blob.arrayBuffer(),
          el("wasmexport").value,
          JSON.parse(el("wasmargs").value),
        ),
      );
    } catch (e) {
      show({ error: e.message });
    }
  };
  reload().catch((e) => {
    el("vaultstatus").textContent = "Persistent storage unavailable: " + e.message;
  });
})();
