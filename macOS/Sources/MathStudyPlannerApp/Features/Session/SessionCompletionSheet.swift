import SwiftUI

enum StudyTimerFormatting {
    static func duration(seconds: TimeInterval) -> String {
        let total = max(0, Int(seconds.rounded(.down)))
        let hours = total / 3_600
        let minutes = (total % 3_600) / 60
        let seconds = total % 60
        if hours > 0 { return String(format: "%d:%02d:%02d", hours, minutes, seconds) }
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

struct SessionCompletionSheet: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @State private var note = ""
    @State private var adjustedMinutes: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Terminer la séance")
                .font(.title.bold())

            if let active = store.activeStudySession {
                VStack(alignment: .leading, spacing: 6) {
                    Text(active.domain.title)
                        .font(.headline)
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        Text(StudyTimerFormatting.duration(
                            seconds: adjustedMinutes.map { TimeInterval($0 * 60) }
                                ?? active.activeSeconds(at: context.date)
                        ))
                            .font(.system(size: 38, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .accessibilityLabel("Temps réellement travaillé")
                    }
                    Text("Temps actif réellement enregistré")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                }

                Stepper(
                    "Durée enregistrée : \(adjustedMinutes ?? measuredMinutes(active, at: Date())) min",
                    value: Binding(
                        get: { adjustedMinutes ?? measuredMinutes(active, at: Date()) },
                        set: { adjustedMinutes = max(0, $0) }
                    ),
                    in: 0...720,
                    step: 5
                )
                .help("Ajustez la durée si le minuteur est resté actif par oubli.")

                VStack(alignment: .leading, spacing: 8) {
                    Text("Compte rendu facultatif")
                        .font(.headline)
                    TextEditor(text: $note)
                        .font(.body)
                        .frame(minHeight: 110)
                        .padding(8)
                        .background(.quaternary.opacity(0.35), in: RoundedRectangle(cornerRadius: 10))
                        .accessibilityLabel("Note de fin de séance")
                }
                if let error = store.operationError {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .font(.callout)
                        .foregroundStyle(.orange)
                }
            } else {
                ContentUnavailableView("Aucune séance active", systemImage: "timer")
            }

            HStack {
                Button("Annuler") { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Spacer()
                Button("Enregistrer la séance") {
                    if store.completeActiveStudySession(
                        note: note,
                        activeSecondsOverride: adjustedMinutes.map { $0 * 60 }
                    ) { dismiss() }
                }
                .buttonStyle(.borderedProminent)
                .keyboardShortcut(.defaultAction)
                .disabled(store.activeStudySession == nil)
            }
        }
        .padding(24)
        .frame(width: 520)
        .onAppear { store.clearOperationError() }
    }

    private func measuredMinutes(_ active: ActiveStudySession, at date: Date) -> Int {
        max(0, Int(active.activeSeconds(at: date) / 60))
    }
}
