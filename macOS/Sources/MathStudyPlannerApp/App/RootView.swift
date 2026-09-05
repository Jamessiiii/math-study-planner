import AppKit
import SwiftUI

enum AppSection: String, CaseIterable, Identifiable {
    case today = "Aujourd’hui"
    case calendar = "Calendrier"
    case programme = "Programme"
    case progress = "Progression"
    case statistics = "Statistiques"

    var id: Self { self }

    var symbol: String {
        switch self {
        case .today: "sun.max"
        case .calendar: "calendar"
        case .progress: "chart.line.uptrend.xyaxis"
        case .statistics: "chart.bar.xaxis"
        case .programme: "slider.horizontal.3"
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var commandRouter: AppCommandRouter
    @State private var selection: AppSection? = .today

    private var visibleError: String? { store.persistenceError ?? store.operationError }

    var body: some View {
        NavigationSplitView {
            List(selection: $selection) {
                ForEach(AppSection.allCases) { section in
                    Label(section.rawValue, systemImage: section.symbol)
                        .font(.body.weight(.medium))
                        .fullWidthHitTarget()
                        .tag(section)
                }
                Section {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Version locale V0.11.3")
                            .font(.footnote.bold())
                        Text("\(store.chapters.count) chapitres")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        Text("Données stockées sur ce Mac")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 8)
                    .fullWidthHitTarget(minHeight: 70)
                }
            }
            .controlSize(.large)
            .navigationTitle("Études")
            .navigationSplitViewColumnWidth(min: 220, ideal: 250)
        } detail: {
            Group {
                switch selection ?? .today {
                case .today:
                    TodayFeatureView(onNavigate: { selection = $0 })
                case .calendar:
                    CalendarFeatureView()
                case .progress:
                    ProgressFeatureView()
                case .statistics:
                    StatisticsFeatureView()
                case .programme:
                    ProgrammeFeatureView()
                }
            }
            .background(AppTheme.windowBackground)
            .safeAreaInset(edge: .top) {
                if let error = visibleError {
                    HStack(spacing: 10) {
                        Image(systemName: "exclamationmark.triangle.fill")
                        Text(error).font(.callout)
                        Spacer()
                        if store.operationError != nil {
                            Button("Fermer") { store.clearOperationError() }
                                .buttonStyle(.borderless)
                        }
                    }
                    .padding(10)
                    .comfortableHitTarget()
                    .background(Color.orange.opacity(0.18))
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("Erreur : \(error)")
                }
            }
        }
        .dynamicTypeSize(.xLarge...)
        .controlSize(.large)
        .onChange(of: commandRouter.request) { _, request in
            selection = request.destination
        }
        .onChange(of: visibleError) { _, error in
            guard let error else { return }
            NSAccessibility.post(
                element: NSApp as Any,
                notification: .announcementRequested,
                userInfo: [
                    .announcement: error,
                    .priority: NSAccessibilityPriorityLevel.high.rawValue
                ]
            )
        }
    }
}
