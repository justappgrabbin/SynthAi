(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    out = $("projectintakeout");
  let original = [];
  const binaryExt =
    /\.(png|jpg|jpeg|gif|webp|ico|pdf|zip|gz|wasm|woff2?|ttf|mp3|mp4|ogg|bin|sqlite|db|apk)$/i;
  $("projectfolder").onchange = async (e) => {
    try {
      const list = Array.from(e.target.files);
      if (list.length > 5000) throw Error("Select a project with at most 5000 files per import");
      const incoming = [];
      for (const f of list) {
        const path = ProjectIntake.normalize(f.webkitRelativePath || f.name),
          bytes = new Uint8Array(await f.arrayBuffer());
        if (bytes.length > 50 * 1024 * 1024) throw Error("File exceeds 50 MB: " + path);
        incoming.push({
          path,
          bytes,
          text: binaryExt.test(path)
            ? null
            : new TextDecoder("utf-8", { fatal: false }).decode(bytes),
        });
      }
      const existing = new Set(original.map((x) => x.path));
      if (incoming.some((x) => existing.has(x.path)))
        throw Error("Duplicate project paths. Export or reload before importing another copy.");
      original.push(...incoming);
      const base = "Project/" + Date.now() + "/";
      for (const f of incoming)
        if (f.text !== null)
          records.push({
            id: base + f.path,
            archive: "Imported",
            path: f.path,
            size: f.bytes.length,
            text: f.text,
          });
      save();
      refresh();
      out.textContent = JSON.stringify(
        {
          imported: incoming.length,
          total: original.length,
          binaryPreserved: incoming.filter((x) => x.text === null).length,
          bytes: incoming.reduce((n, x) => n + x.bytes.length, 0),
          status:
            "Original bytes retained in this session. Text records added to computer registry.",
        },
        null,
        2,
      );
    } catch (err) {
      out.textContent = err.message;
    }
  };
  $("projectdependencies").onclick = () => {
    out.textContent = JSON.stringify(
      ProjectIntake.connections(
        original.length
          ? original
          : records
              .filter((r) => r.archive === "Imported")
              .map((r) => ({ path: r.path, text: r.text })),
      ),
      null,
      2,
    );
  };
  $("projectexportzip").onclick = () => {
    try {
      if (!original.length) throw Error("Import a project folder first");
      const blob = ProjectIntake.zip(original),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "preserved-project-" + Date.now() + ".zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      out.textContent =
        "Exported " + original.length + " original files without modifying their bytes.";
    } catch (err) {
      out.textContent = err.message;
    }
  };
})();
