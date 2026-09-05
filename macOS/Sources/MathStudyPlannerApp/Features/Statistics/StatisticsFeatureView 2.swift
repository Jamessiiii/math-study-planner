import Charts
import SwiftUI

struct StatisticsFeatureView: View {
    @EnvironmentObject private var store: AppStore

    private var domainSummaries: [(domain: StudyDomainKind, completed: Int, worked: Int)] {
        StudyDomainKind.allCases.map { domain in
            let completed = store.chapters.filter { $0.domain == domain && $0.status == .done }.count
            let worked = store.sessions.filter { $0.domain == domain && $0.isWorked }.reduce(0) { $0 + $1.workedMinutes }
            return (domain, completed, worked)
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Avancement par domaine")
                    .font(.title2.bold())

                Chart(domainSummaries, id: \.domain) { summary in
                    BarMark(
                        x: .value("Domaine", summary.domain.title),
                        y: .value("Chapitres terminés", summary.completed)
                    )
                    .foregroundStyle(AppTheme.color(for: summary.domain))
                    .cornerRadius(5)
                }
                .frame(height: 280)

                HStack(spacing: 14) {
                    ForEach(domainSummaries, id: \.domain) { summary in
                        VStack(alignment: .leading, spacing: 8) {
                            DomainBadge(domain: summary.domain)
                            Text("\(summary.completed)").font(.title.bold())
                            Text("chapitre(s) terminé(s)").foregroundStyle(.secondary)
                            Text("\(summary.worked) min travaillées").font(.caption)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(18)
                        .background(.background, in: RoundedRectangle(cornerRadius: 14))
                    }
                }
            }
            .padding(24)
        }
        .navigationTitle("Statistiques")
    }
}
