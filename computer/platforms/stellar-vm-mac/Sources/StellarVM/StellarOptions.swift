import Foundation

struct StellarOptions {
    var bundlePath: String
    var isoPath: String?
    var cpuCount: Int
    var memoryGiB: Int
    var diskGiB: Int
    var width: Int
    var height: Int

    static func parse(_ args: [String]) -> StellarOptions {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        var options = StellarOptions(
            bundlePath: home + "/StellarVM.bundle",
            isoPath: nil,
            cpuCount: 4,
            memoryGiB: 4,
            diskGiB: 32,
            width: 1440,
            height: 900
        )

        var i = 1
        while i < args.count {
            switch args[i] {
            case "--bundle", "-b":
                i += 1
                if i < args.count { options.bundlePath = (args[i] as NSString).expandingTildeInPath }
            case "--iso", "-i":
                i += 1
                if i < args.count { options.isoPath = (args[i] as NSString).expandingTildeInPath }
            case "--cpus", "-c":
                i += 1
                if i < args.count, let v = Int(args[i]) { options.cpuCount = v }
            case "--memory", "-m":
                i += 1
                if i < args.count, let v = Int(args[i]) { options.memoryGiB = v }
            case "--disk", "-d":
                i += 1
                if i < args.count, let v = Int(args[i]) { options.diskGiB = v }
            case "--width":
                i += 1
                if i < args.count, let v = Int(args[i]) { options.width = v }
            case "--height":
                i += 1
                if i < args.count, let v = Int(args[i]) { options.height = v }
            default:
                break
            }
            i += 1
        }
        return options
    }
}
