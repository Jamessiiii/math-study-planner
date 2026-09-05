import SwiftUI

struct ProgrammeFeatureView: View {
    @State private var selectedWeek: WeekKind = WeekCycle.kind(for: Date())

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Picker("Semaine", selection: $selectedWeek) {
                ForEach(WeekKind.allCases) { week in
                    Text(week.title).tag(week)
                }
            }
            .pickerStyle(.segmented)
            .frame(width: 300)

            Text("Répartition hebdomadaire")
                .font(.title2.bold())

            Grid(alignment: .leading, horizontalSpacing: 28, verticalSpacing: 12) {
                GridRow {
                    Text("Jour").font(.caption.bold()).foregroundStyle(.secondary)
                    Text("Domaine").font(.caption.bold()).foregroundStyle(.secondary)
                    Text("Créneau par défaut").font(.caption.bold()).foregroundStyle(.secondary)
                }
                Divider().gridCellColumns(3)
                ForEach(WeekAssignment.assignments(for: selectedWeek)) { assignment in
                    GridRow {
                        Text(dayName(for: assignment.dayOffset)).font(.headline)
                        DomainBadge(domain: assignment.domain)
                        Text("09:00 – 12:30").monospacedDigit().foregroundStyle(.secondary)
                    }
                    Divider().gridCellColumns(3)
                }
            }
            .padding(20)
            .background(.background, in: RoundedRectangle(cornerRadius: 14))

            Text("Les horaires et l’affectation par jour deviendront éditables dans cette vue. L’alternance A/B reste calculée automatiquement à partir du calendrier réel.")
                .foregroundStyle(.secondary)
            Spacer()
        }
        .padding(24)
        .navigationTitle("Programme")
    }

    private func dayName(for offset: Int) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.dateFormat = "EEEE"
        let monday = WeekCycle.monday(containing: Date())
        let date = Calendar.current.date(byAdding: .day, value: offset, to: monday) ?? monday
        return formatter.string(from: date).capitalized
    }
}
