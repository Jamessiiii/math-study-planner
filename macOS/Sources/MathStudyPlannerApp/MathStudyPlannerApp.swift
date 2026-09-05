import Darwin
import SwiftUI

@main
struct MathStudyPlannerApp: App {
    @StateObject private var store: AppStore
    @StateObject private var commandRouter: AppCommandRouter
    @StateObject private var notificationManager: CourseNotificationManager

    init() {
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains("--self-test") {
            Darwin.exit(SelfChecks.run() ? EXIT_SUCCESS : EXIT_FAILURE)
        }
        let argumentFileURL = arguments.firstIndex(of: "--data-file").flatMap { index -> URL? in
            let valueIndex = arguments.index(after: index)
            guard arguments.indices.contains(valueIndex) else { return nil }
            return URL(fileURLWithPath: arguments[valueIndex])
        }
        let environmentFileURL = ProcessInfo.processInfo.environment["MATH_STUDY_PLANNER_DATA_FILE"]
            .map { URL(fileURLWithPath: $0) }
        let testFileURL = argumentFileURL ?? environmentFileURL
        let appStore = AppStore(fileURL: testFileURL)
        _ = appStore.ensurePlanningHorizon(
            from: Date(),
            weeksAhead: UpcomingCourseService.defaultWeeksAhead
        )
        let router = AppCommandRouter()
        _store = StateObject(wrappedValue: appStore)
        _commandRouter = StateObject(wrappedValue: router)
        _notificationManager = StateObject(wrappedValue: CourseNotificationManager(store: appStore, router: router))
    }

    var body: some Scene {
        Window("Math Study Planner", id: "main") {
            RootView()
                .frame(minWidth: 980, minHeight: 680)
                .environmentObject(store)
                .environmentObject(commandRouter)
                .environmentObject(notificationManager)
        }
        .defaultSize(width: 1180, height: 780)
        .commands {
            PlannerCommands(router: commandRouter)
        }

        Settings {
            SettingsView()
                .frame(width: 520, height: 560)
                .environmentObject(store)
                .environmentObject(notificationManager)
        }

        MenuBarExtra {
            MenuBarCourseView(store: store, router: commandRouter)
        } label: {
            MenuBarCourseLabel(store: store)
        }
        .menuBarExtraStyle(.window)
    }
}
