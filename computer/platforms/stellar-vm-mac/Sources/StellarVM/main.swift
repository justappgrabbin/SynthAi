import AppKit

let app = NSApplication.shared
let delegate = StellarAppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
