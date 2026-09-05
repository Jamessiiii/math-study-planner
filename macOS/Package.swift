// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "MathStudyPlanner",
    defaultLocalization: "fr",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "MathStudyPlanner", targets: ["MathStudyPlannerApp"])
    ],
    targets: [
        .executableTarget(
            name: "MathStudyPlannerApp",
            path: "Sources/MathStudyPlannerApp",
            exclude: [
                "Checks/SelfChecks 2.swift",
                "Features/Calendar/CalendarFeatureView 2.swift",
                "Features/Programme/ProgrammeFeatureView 2.swift",
                "Features/Progress/ProgressFeatureView 2.swift",
                "Features/Statistics/StatisticsFeatureView 2.swift",
                "Persistence/AppStore 2.swift"
            ],
            resources: [
                .process("Resources")
            ]
        )
    ]
)
