import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var synthiaProcess: Process?
    private var bridgeProcess: Process?
    private var pairingToken = ""
    private var stateDirectory: URL!

    func applicationDidFinishLaunching(_ notification: Notification) {
        do {
            try prepareRuntime()
            buildMenus()
            buildWindow()
            try startProcesses()
            loadWhenReady(attempt: 0)
        } catch {
            let alert = NSAlert()
            alert.messageText = "Synthia could not start"
            alert.informativeText = error.localizedDescription
            alert.runModal()
            NSApp.terminate(nil)
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        synthiaProcess?.terminate()
        bridgeProcess?.terminate()
    }

    private func prepareRuntime() throws {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Synthia", isDirectory: true)
        try FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        stateDirectory = base.appendingPathComponent("state", isDirectory: true)
        try FileManager.default.createDirectory(at: stateDirectory, withIntermediateDirectories: true)
        let tokenFile = base.appendingPathComponent("mac-pairing-token.txt")
        if let existing = try? String(contentsOf: tokenFile, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines),
           !existing.isEmpty {
            pairingToken = existing
        } else {
            pairingToken = UUID().uuidString.replacingOccurrences(of: "-", with: "") + UUID().uuidString.replacingOccurrences(of: "-", with: "")
            try pairingToken.write(to: tokenFile, atomically: true, encoding: .utf8)
        }
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: tokenFile.path)
    }

    private func buildMenus() {
        let main = NSMenu()
        let appItem = NSMenuItem()
        appItem.title = "Synthia"
        main.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "Show Pairing Code", action: #selector(showPairingCode), keyEquivalent: "p")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Quit Synthia", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        NSApp.mainMenu = main
    }

    private func buildWindow() {
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1120, height: 780),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Synthia"
        window.center()
        webView = WKWebView(frame: window.contentView!.bounds)
        webView.autoresizingMask = [.width, .height]
        window.contentView?.addSubview(webView)
        window.makeKeyAndOrderFront(nil)
    }

    private func nodeURL() throws -> URL {
        guard let resources = Bundle.main.resourceURL else { throw NSError(domain: "Synthia", code: 1) }
        #if arch(arm64)
        let node = resources.appendingPathComponent("runtime/node-arm64")
        #else
        let node = resources.appendingPathComponent("runtime/node-x64")
        #endif
        guard FileManager.default.isExecutableFile(atPath: node.path) else {
            throw NSError(domain: "Synthia", code: 2, userInfo: [NSLocalizedDescriptionKey: "Bundled Node runtime is missing"])
        }
        return node
    }

    private func process(_ arguments: [String], directory: URL, extraEnvironment: [String: String]) throws -> Process {
        let p = Process()
        p.executableURL = try nodeURL()
        p.arguments = arguments
        p.currentDirectoryURL = directory
        var env = ProcessInfo.processInfo.environment
        for (key, value) in extraEnvironment { env[key] = value }
        p.environment = env
        let log = Pipe()
        p.standardOutput = log
        p.standardError = log
        try p.run()
        return p
    }

    private func startProcesses() throws {
        guard let resources = Bundle.main.resourceURL else { throw NSError(domain: "Synthia", code: 3) }
        let macDir = resources.appendingPathComponent("mac", isDirectory: true)
        let synthiaDir = resources.appendingPathComponent("synthia", isDirectory: true)
        let bridge = macDir.appendingPathComponent("mac-bridge.mjs")
        let server = synthiaDir.appendingPathComponent("src/ui/server.mjs")

        bridgeProcess = try process(
            [bridge.path],
            directory: macDir,
            extraEnvironment: [
                "SYNTHIA_MAC_BRIDGE_HOST": "0.0.0.0",
                "SYNTHIA_MAC_BRIDGE_PORT": "8798",
                "SYNTHIA_MAC_BRIDGE_TOKEN": pairingToken,
            ]
        )

        synthiaProcess = try process(
            [server.path],
            directory: synthiaDir,
            extraEnvironment: [
                "HOST": "127.0.0.1",
                "PORT": "4183",
                "SYNTHIA_DATA_DIR": stateDirectory.path,
                "SYNTHIA_MAC_BRIDGE_URL": "http://127.0.0.1:8798",
                "SYNTHIA_MAC_BRIDGE_TOKEN": pairingToken,
                "SYNTHIA_TALK_PYTHON": resources.appendingPathComponent("runtime/talk-python-shim").path,
            ]
        )
    }

    private func loadWhenReady(attempt: Int) {
        guard attempt < 120 else {
            webView.loadHTMLString("<h1>Synthia runtime did not answer on localhost:4183</h1>", baseURL: nil)
            return
        }
        let url = URL(string: "http://127.0.0.1:4183/api/solo/status")!
        URLSession.shared.dataTask(with: url) { [weak self] _, response, _ in
            DispatchQueue.main.async {
                if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                    self?.webView.load(URLRequest(url: URL(string: "http://127.0.0.1:4183/")!))
                } else {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                        self?.loadWhenReady(attempt: attempt + 1)
                    }
                }
            }
        }.resume()
    }

    @objc private func showPairingCode() {
        let host = ProcessInfo.processInfo.hostName
        let value = "http://\(host):8798\n\(pairingToken)"
        let alert = NSAlert()
        alert.messageText = "Pair this Mac with Synthia Android"
        alert.informativeText = "Mac bridge:\nhttp://\(host):8798\n\nPairing token:\n\(pairingToken)"
        alert.addButton(withTitle: "Copy")
        alert.addButton(withTitle: "Close")
        if alert.runModal() == .alertFirstButtonReturn {
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(value, forType: .string)
        }
    }
}

func selfTest() -> Int32 {
    guard let resources = Bundle.main.resourceURL else {
        fputs("FAIL no resources\n", stderr)
        return 2
    }
    #if arch(arm64)
    let node = resources.appendingPathComponent("runtime/node-arm64")
    #else
    let node = resources.appendingPathComponent("runtime/node-x64")
    #endif
    let server = resources.appendingPathComponent("synthia/src/ui/server.mjs")
    let bridge = resources.appendingPathComponent("mac/mac-bridge.mjs")
    let ok = FileManager.default.isExecutableFile(atPath: node.path)
        && FileManager.default.fileExists(atPath: server.path)
        && FileManager.default.fileExists(atPath: bridge.path)
    print(ok ? "PASS Synthia Mac bundle resources" : "FAIL Synthia Mac bundle resources")
    return ok ? 0 : 3
}

if CommandLine.arguments.contains("--self-test") {
    exit(selfTest())
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.activate(ignoringOtherApps: true)
app.run()
