import Cocoa
import WebKit

final class SynthiaAppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    private var window: NSWindow?
    private var webView: WKWebView?
    private var runtime: Process?
    private var logHandle: FileHandle?
    private let port = 4173

    private var runtimeURL: URL {
        URL(string: "http://127.0.0.1:\(port)")!
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        buildWindow()
        do {
            try startRuntime()
            waitForRuntime(attempt: 0)
        } catch {
            showFailure("Synthia runtime could not start.\n\n\(error.localizedDescription)")
        }
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationWillTerminate(_ notification: Notification) {
        stopRuntime()
    }

    private func buildWindow() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = self

        let frame = NSRect(x: 0, y: 0, width: 470, height: 820)
        let win = NSWindow(
            contentRect: frame,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        win.title = "Synthia"
        win.minSize = NSSize(width: 360, height: 560)
        win.center()
        win.isReleasedWhenClosed = false
        win.titlebarAppearsTransparent = true
        win.contentView = view
        win.makeKeyAndOrderFront(nil)

        self.webView = view
        self.window = win
    }

    private func startRuntime() throws {
        guard let resources = Bundle.main.resourceURL else {
            throw RuntimeError("App resources are missing.")
        }

        let node = resources.appendingPathComponent("runtime/node")
        let hover = resources.appendingPathComponent("hover")
        let entry = hover.appendingPathComponent("src/ui/server.mjs")

        guard FileManager.default.isExecutableFile(atPath: node.path) else {
            throw RuntimeError("Embedded Node runtime is missing.")
        }
        guard FileManager.default.fileExists(atPath: entry.path) else {
            throw RuntimeError("Synthia Hover runtime is missing.")
        }

        let support = try applicationSupportDirectory()
        let state = support.appendingPathComponent("state", isDirectory: true)
        try FileManager.default.createDirectory(at: state, withIntermediateDirectories: true)

        let logURL = support.appendingPathComponent("synthia-macos.log")
        if !FileManager.default.fileExists(atPath: logURL.path) {
            FileManager.default.createFile(atPath: logURL.path, contents: nil)
        }
        let handle = try FileHandle(forWritingTo: logURL)
        try handle.seekToEnd()

        let process = Process()
        process.executableURL = node
        process.arguments = [entry.path]
        process.currentDirectoryURL = hover

        var env = ProcessInfo.processInfo.environment
        env["HOST"] = "127.0.0.1"
        env["PORT"] = String(port)
        env["SYNTHIA_DATA_DIR"] = state.path
        env["HOME"] = support.path
        env["SYNTHIA_TALK_PYTHON"] = resources.appendingPathComponent("runtime/talk-python-shim").path
        process.environment = env
        process.standardOutput = handle
        process.standardError = handle
        process.terminationHandler = { [weak self] finished in
            DispatchQueue.main.async {
                guard let self, NSApp.isRunning else { return }
                if finished.terminationStatus != 0 {
                    self.showFailure("Synthia runtime stopped unexpectedly.\n\nLog: \(logURL.path)")
                }
            }
        }

        try process.run()
        runtime = process
        logHandle = handle
    }

    private func stopRuntime() {
        if let process = runtime, process.isRunning {
            process.terminate()
            process.waitUntilExit()
        }
        runtime = nil
        try? logHandle?.close()
        logHandle = nil
    }

    private func waitForRuntime(attempt: Int) {
        guard attempt < 120 else {
            showFailure("Synthia did not become ready on \(runtimeURL.absoluteString).")
            return
        }

        let status = runtimeURL.appendingPathComponent("api/solo/status")
        URLSession.shared.dataTask(with: status) { [weak self] data, response, _ in
            guard let self else { return }
            let ok = (response as? HTTPURLResponse)?.statusCode == 200 && data != nil
            DispatchQueue.main.asyncAfter(deadline: .now() + (ok ? 0.0 : 0.15)) {
                if ok {
                    self.webView?.load(URLRequest(url: self.runtimeURL))
                } else if self.runtime?.isRunning == true {
                    self.waitForRuntime(attempt: attempt + 1)
                } else {
                    self.showFailure("Synthia runtime exited before the window was ready.")
                }
            }
        }.resume()
    }

    private func showFailure(_ message: String) {
        guard let view = webView else { return }
        let escaped = message
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
        let html = """
        <!doctype html><meta charset="utf-8">
        <style>
        body{font:16px -apple-system,BlinkMacSystemFont,sans-serif;background:#f7f1ff;color:#30194f;padding:32px}
        h1{font-size:28px}pre{white-space:pre-wrap;background:#fff;padding:16px;border-radius:14px}
        </style><h1>Synthia</h1><pre>\(escaped)</pre>
        """
        view.loadHTMLString(html, baseURL: nil)
    }

    private func applicationSupportDirectory() throws -> URL {
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            throw RuntimeError("Application Support is unavailable.")
        }
        let dir = base.appendingPathComponent("Synthia", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private struct RuntimeError: LocalizedError {
        let message: String
        init(_ message: String) { self.message = message }
        var errorDescription: String? { message }
    }
}

let application = NSApplication.shared
let delegate = SynthiaAppDelegate()
application.delegate = delegate
application.run()
