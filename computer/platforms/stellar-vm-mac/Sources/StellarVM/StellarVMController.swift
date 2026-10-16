import Foundation
import Virtualization
import AppKit

final class StellarVMController: NSObject, VZVirtualMachineDelegate {
    let options: StellarOptions
    let bundleURL: URL
    let diskURL: URL
    let machineIDURL: URL
    let nvramURL: URL
    let virtualMachine: VZVirtualMachine
    private let installing: Bool

    init(options: StellarOptions) throws {
        self.options = options
        self.bundleURL = URL(fileURLWithPath: options.bundlePath, isDirectory: true)
        self.diskURL = bundleURL.appendingPathComponent("Disk.img")
        self.machineIDURL = bundleURL.appendingPathComponent("MachineIdentifier")
        self.nvramURL = bundleURL.appendingPathComponent("NVRAM")

        try FileManager.default.createDirectory(at: bundleURL, withIntermediateDirectories: true)

        let diskAlreadyExists = FileManager.default.fileExists(atPath: diskURL.path)
        self.installing = options.isoPath != nil

        if !diskAlreadyExists {
            try Self.createSparseDisk(at: diskURL, sizeGiB: options.diskGiB)
        }

        let config = VZVirtualMachineConfiguration()
        config.cpuCount = Self.clampedCPUCount(options.cpuCount)
        config.memorySize = Self.clampedMemory(UInt64(options.memoryGiB) * 1024 * 1024 * 1024)

        let platform = VZGenericPlatformConfiguration()
        platform.machineIdentifier = try Self.loadOrCreateMachineIdentifier(at: machineIDURL)
        config.platform = platform

        let bootLoader = VZEFIBootLoader()
        if FileManager.default.fileExists(atPath: nvramURL.path) {
            bootLoader.variableStore = VZEFIVariableStore(url: nvramURL)
        } else {
            bootLoader.variableStore = try VZEFIVariableStore(creatingVariableStoreAt: nvramURL)
        }
        config.bootLoader = bootLoader

        var storage: [VZStorageDeviceConfiguration] = []

        if let isoPath = options.isoPath {
            let isoURL = URL(fileURLWithPath: isoPath)
            guard FileManager.default.fileExists(atPath: isoURL.path) else {
                throw StellarVMError.missingISO(isoURL.path)
            }
            let isoAttachment = try VZDiskImageStorageDeviceAttachment(url: isoURL, readOnly: true)
            storage.append(VZUSBMassStorageDeviceConfiguration(attachment: isoAttachment))
        }

        let diskAttachment = try VZDiskImageStorageDeviceAttachment(url: diskURL, readOnly: false)
        storage.append(VZVirtioBlockDeviceConfiguration(attachment: diskAttachment))
        config.storageDevices = storage

        let graphics = VZVirtioGraphicsDeviceConfiguration()
        graphics.scanouts = [
            VZVirtioGraphicsScanoutConfiguration(
                widthInPixels: options.width,
                heightInPixels: options.height
            )
        ]
        config.graphicsDevices = [graphics]

        config.keyboards = [VZUSBKeyboardConfiguration()]
        config.pointingDevices = [VZUSBScreenCoordinatePointingDeviceConfiguration()]

        let network = VZVirtioNetworkDeviceConfiguration()
        network.attachment = VZNATNetworkDeviceAttachment()
        config.networkDevices = [network]

        config.entropyDevices = [VZVirtioEntropyDeviceConfiguration()]
        config.memoryBalloonDevices = [VZVirtioTraditionalMemoryBalloonDeviceConfiguration()]
        config.socketDevices = [VZVirtioSocketDeviceConfiguration()]

        try config.validate()

        self.virtualMachine = VZVirtualMachine(configuration: config)
        super.init()
        self.virtualMachine.delegate = self
    }

    func start() {
        virtualMachine.start { result in
            switch result {
            case .success:
                if self.installing {
                    print("Stellar VM booted from installer. Install Linux onto the virtual disk, shut the guest down, then launch Stellar VM again without --iso.")
                } else {
                    print("Stellar VM booted from its persistent disk.")
                }
            case .failure(let error):
                let alert = NSAlert()
                alert.alertStyle = .critical
                alert.messageText = "VM start failed"
                alert.informativeText = error.localizedDescription
                alert.runModal()
            }
        }
    }

    func guestDidStop(_ virtualMachine: VZVirtualMachine) {
        print("Stellar VM guest stopped.")
    }

    func virtualMachine(_ virtualMachine: VZVirtualMachine, didStopWithError error: Error) {
        let alert = NSAlert()
        alert.alertStyle = .critical
        alert.messageText = "Stellar VM stopped unexpectedly"
        alert.informativeText = error.localizedDescription
        alert.runModal()
    }

    private static func createSparseDisk(at url: URL, sizeGiB: Int) throws {
        guard sizeGiB >= 8 else { throw StellarVMError.diskTooSmall }
        FileManager.default.createFile(atPath: url.path, contents: nil)
        let handle = try FileHandle(forWritingTo: url)
        defer { try? handle.close() }
        try handle.truncate(atOffset: UInt64(sizeGiB) * 1024 * 1024 * 1024)
    }

    private static func loadOrCreateMachineIdentifier(at url: URL) throws -> VZGenericMachineIdentifier {
        if FileManager.default.fileExists(atPath: url.path) {
            let data = try Data(contentsOf: url)
            guard let id = VZGenericMachineIdentifier(dataRepresentation: data) else {
                throw StellarVMError.invalidMachineIdentifier
            }
            return id
        }

        let id = VZGenericMachineIdentifier()
        try id.dataRepresentation.write(to: url, options: .atomic)
        return id
    }

    private static func clampedCPUCount(_ requested: Int) -> Int {
        min(
            max(requested, VZVirtualMachineConfiguration.minimumAllowedCPUCount),
            VZVirtualMachineConfiguration.maximumAllowedCPUCount
        )
    }

    private static func clampedMemory(_ requested: UInt64) -> UInt64 {
        min(
            max(requested, VZVirtualMachineConfiguration.minimumAllowedMemorySize),
            VZVirtualMachineConfiguration.maximumAllowedMemorySize
        )
    }
}

enum StellarVMError: LocalizedError {
    case diskTooSmall
    case missingISO(String)
    case invalidMachineIdentifier

    var errorDescription: String? {
        switch self {
        case .diskTooSmall:
            return "The VM disk must be at least 8 GiB."
        case .missingISO(let path):
            return "Linux installer ISO not found: \(path)"
        case .invalidMachineIdentifier:
            return "The saved VM machine identifier is invalid. Delete MachineIdentifier from the VM bundle and retry."
        }
    }
}
