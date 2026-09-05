import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var notifications: CourseNotificationManager

    var body: some View {
        Form {
            Section("Données") {
                LabeledContent("Catalogue", value: "\(store.chapters.count) chapitres")
                    .comfortableHitTarget()
                LabeledContent("Séances", value: "\(store.sessions.count)")
                    .comfortableHitTarget()
                LabeledContent("Activités", value: "\(store.activities.count)")
                    .comfortableHitTarget()
                LabeledContent("Séances chronométrées", value: "\(store.studyExecutions.count)")
                    .comfortableHitTarget()
                LabeledContent("Sauvegarde", value: store.persistenceError == nil ? "À jour" : "À vérifier")
                    .comfortableHitTarget()
            }
            Section("Synchronisation") {
                LabeledContent("Stockage actuel", value: "Local sur ce Mac")
                    .comfortableHitTarget()
                LabeledContent("iCloud / CloudKit", value: "Préparé, non activé")
                    .comfortableHitTarget()
                Text("La source mobile reste intacte. L’activation d’iCloud attend la validation de l’import et la configuration du conteneur Apple.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 4)
            }
            Section("Rappels avant les cours") {
                Toggle("Notifications locales", isOn: Binding(
                    get: { notifications.isEnabled },
                    set: { notifications.setEnabled($0) }
                ))
                .comfortableHitTarget()

                Picker("Prévenir", selection: Binding(
                    get: { notifications.leadMinutes },
                    set: { notifications.setLeadMinutes($0) }
                )) {
                    Text("5 min avant").tag(5)
                    Text("15 min avant").tag(15)
                    Text("30 min avant").tag(30)
                    Text("1 h avant").tag(60)
                }
                .disabled(!notifications.isEnabled)

                LabeledContent("Autorisation", value: notifications.authorizationState.label)
                if notifications.isEnabled {
                    LabeledContent("Rappels programmés", value: "\(notifications.pendingReminderCount)")
                }
                if notifications.authorizationState == .denied {
                    Button("Ouvrir les réglages de notifications") {
                        notifications.openSystemNotificationSettings()
                    }
                }
                if let error = notifications.lastError {
                    Label(error, systemImage: "exclamationmark.triangle")
                        .foregroundStyle(.orange)
                }
                Text("L’autorisation macOS n’est demandée qu’au moment où vous activez cette option. Les rappels restent entièrement locaux.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            }
        }
        .font(.body)
        .formStyle(.grouped)
        .controlSize(.large)
        .padding(20)
    }
}
