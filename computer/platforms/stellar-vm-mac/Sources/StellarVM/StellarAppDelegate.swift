import AppKit
import Virtualization

final class StellarAppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow?
    private var controller: StellarVMController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        guard VZVirtualMachine.isSupported else {
            showFatal("This Mac does not support Apple Virtualization.framework.")
            return
        }

        var options = StellarOptions.parse(CommandLine.arguments)
        let bundleURL = URL(fileURLWithPath: options.bundlePath, isDirectory: true)
        let diskURL = bundleURL.appendingPathComponent("Disk.img")

        if !FileManager.default.fileExists(atPath: diskURL.path), options.isoPath == nil {
            let panel = NSOpenPanel()
            panel.title = "Choose a Linux installer ISO"
            panel.prompt = "Boot Installer"
            panel.allowsMultipleSelection = false
            panel.canChooseDirectories = false
            if panel.runModal() == .OK, let url = panel.url {
                options.isoPath = url.path
            } else {
                showFatal("A Linux installer ISO is required the first time this VM is created.")
                return
            }
        }

        do {
            let vmController = try StellarVMController(options: options)
            controller = vmController

            let view = VZVirtualMachineView(frame: NSRect(x: 0, y: 0, width: options.width, height: options.height))
            view.virtualMachine = vmController.virtualMachine
            if #available(macOS 14.0, *) {
                view.automaticallyReconfiguresDisplay = true
            }

            let window = NSWindow(
                contentRect: NSRect(x: 0, y: 0, width: options.width, height: options.height),
                styleMask: [.titled, .closable, .miniaturizable, .resizable],
                backing: .buffered,
                defer: false
            )
            window.title = "Stellar VM"
            window.center()
            window.contentView = view
            window.makeKeyAndOrderFront(nil)
            self.window = window

            NSApp.activate(ignoringOtherApps: true)
            vmController.start()
        } catch {
            showFatal(error.localizedDescription)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    private func showFatal(_ text: String) {
        let alert = NSAlert()
        alert.alertStyle = .critical
        alert.messageText = "Stellar VM could not start"
        alert.informativeText = text
        alert.runModal()
        NSApp.terminate(nil)
    }
}
