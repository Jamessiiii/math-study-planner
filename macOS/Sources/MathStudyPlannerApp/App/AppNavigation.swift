import SwiftUI

struct AppNavigationRequest: Equatable {
    let id = UUID()
    let destination: AppSection
    let opensNewSession: Bool
    let opensSessionCompletion: Bool
}

@MainActor
final class AppCommandRouter: ObservableObject {
    @Published private(set) var request = AppNavigationRequest(
        destination: .today,
        opensNewSession: false,
        opensSessionCompletion: false
    )

    func navigate(to section: AppSection) {
        request = AppNavigationRequest(destination: section, opensNewSession: false, opensSessionCompletion: false)
    }

    func requestNewSession() {
        request = AppNavigationRequest(destination: .calendar, opensNewSession: true, opensSessionCompletion: false)
    }

    func requestSessionCompletion() {
        request = AppNavigationRequest(destination: .today, opensNewSession: false, opensSessionCompletion: true)
    }
}

struct PlannerCommands: Commands {
    @ObservedObject var router: AppCommandRouter

    var body: some Commands {
        CommandGroup(replacing: .newItem) {
            Button("Nouvelle séance") { router.requestNewSession() }
                .keyboardShortcut("n", modifiers: .command)
        }

        CommandMenu("Navigation") {
            navigationButton("Aujourd’hui", section: .today, key: "1")
            navigationButton("Calendrier", section: .calendar, key: "2")
            navigationButton("Programme", section: .programme, key: "3")
            navigationButton("Progression", section: .progress, key: "4")
            navigationButton("Statistiques", section: .statistics, key: "5")
        }
    }

    private func navigationButton(_ title: String, section: AppSection, key: KeyEquivalent) -> some View {
        Button(title) { router.navigate(to: section) }
            .keyboardShortcut(key, modifiers: .command)
    }
}
