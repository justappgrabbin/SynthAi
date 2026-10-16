// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "StellarVM",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "StellarVM", targets: ["StellarVM"])
    ],
    targets: [
        .executableTarget(
            name: "StellarVM",
            path: "Sources/StellarVM",
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("Virtualization")
            ]
        )
    ]
)
