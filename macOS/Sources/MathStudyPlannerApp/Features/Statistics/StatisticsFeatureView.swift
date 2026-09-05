import Charts
import Foundation
import SwiftUI

struct StatisticsFeatureView: View {
    @EnvironmentObject private var store: AppStore

    private struct PeriodSummary: Identifiable {
        let days: Int
        let minutes: Int
        let activeDays: Int

        var id: Int { days }
    }

    private struct DomainSummary: Identifiable {
        let domain: StudyDomainKind
        let minutes: Int
        let completedChapters: Int
        let totalChapters: Int

        var id: StudyDomainKind { domain }
        var progress: Double {
            guard totalChapters > 0 else { return 0 }
            return Double(completedChapters) / Double(totalChapters)
        }
    }

    private struct DailyActivity: Identifiable {
        let date: Date
        let minutes: Int

        var id: Date { date }
    }

    private struct TrendSummary {
        let currentMinutes: Int
        let previousMinutes: Int
        let currentActiveDays: Int
        let previousActiveDays: Int

        var percentageChange: Double? {
            guard previousMinutes > 0 else { return currentMinutes == 0 ? 0 : nil }
            return Double(currentMinutes - previousMinutes) / Double(previousMinutes)
        }
    }

    private struct DashboardSnapshot {
        let completedChapters: Int
        let totalChapters: Int
        let workedSessions: Int
        let periods: [PeriodSummary]
        let trend: TrendSummary
        let domains: [DomainSummary]
        let dailyActivity: [DailyActivity]
        let currentPeriodStart: Date

        var globalProgress: Double {
            guard totalChapters > 0 else { return 0 }
            return Double(completedChapters) / Double(totalChapters)
        }

        var hasRecentMinutes: Bool {
            periods.contains { $0.minutes > 0 }
        }
    }

    private var guadeloupeCalendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "fr_FR")
        calendar.timeZone = TimeZone(identifier: "America/Guadeloupe")
            ?? TimeZone(secondsFromGMT: -4 * 60 * 60)!
        return calendar
    }

    var body: some View {
        let snapshot = makeSnapshot(at: Date())

        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                dashboardHeader
                globalProgressCard(snapshot)

                if !snapshot.hasRecentMinutes {
                    noRecentDataBanner
                }

                sectionTitle(
                    "Rythme récent",
                    subtitle: "Un jour est compté « actif » seulement s’il totalise des minutes réelles (> 0), bornes locales America/Guadeloupe"
                )

                LazyVGrid(
                    columns: [GridItem(.adaptive(minimum: 210), spacing: 14)],
                    spacing: 14
                ) {
                    ForEach(snapshot.periods) { period in
                        periodCard(period)
                    }
                }

                trendCard(snapshot.trend)

                sectionTitle(
                    "Répartition par domaine",
                    subtitle: "Temps enregistré sur les 30 derniers jours"
                )
                domainChart(snapshot.domains)
                domainDetailGrid(snapshot.domains)

                sectionTitle(
                    "Activité récente",
                    subtitle: "Minutes enregistrées chaque jour depuis le \(snapshot.currentPeriodStart.formatted(.dateTime.day().month(.wide)))"
                )
                activityChart(snapshot.dailyActivity)
            }
            .padding(24)
        }
        .background(AppTheme.windowBackground)
        .navigationTitle("Statistiques")
    }

    private var dashboardHeader: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("Tableau de bord")
                .font(.largeTitle.bold())
            Text("Une vue synthétique de votre progression et de votre régularité.")
                .foregroundStyle(.secondary)
        }
    }

    private var noRecentDataBanner: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "sparkles")
                .font(.title3)
                .foregroundStyle(Color.accentColor)
            VStack(alignment: .leading, spacing: 3) {
                Text("Aucune minute enregistrée sur les 30 derniers jours")
                    .font(.subheadline.weight(.semibold))
                Text("Lancez le minuteur depuis « Aujourd’hui » : le temps actif réellement enregistré alimentera automatiquement ces statistiques.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.accentColor.opacity(0.07), in: RoundedRectangle(cornerRadius: 14))
    }

    private func globalProgressCard(_ snapshot: DashboardSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 18) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .firstTextBaseline, spacing: 24) {
                    progressHeadline(snapshot)
                    Spacer(minLength: 20)
                    globalFacts(snapshot)
                }

                VStack(alignment: .leading, spacing: 14) {
                    progressHeadline(snapshot)
                    globalFacts(snapshot)
                }
            }

            ProgressView(value: snapshot.globalProgress)
                .progressViewStyle(.linear)
                .tint(.accentColor)
                .accessibilityLabel("Progression globale")
                .accessibilityValue(snapshot.globalProgress.formatted(.percent.precision(.fractionLength(0))))
        }
        .padding(20)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .stroke(.quaternary, lineWidth: 1)
        }
    }

    private func progressHeadline(_ snapshot: DashboardSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(snapshot.globalProgress, format: .percent.precision(.fractionLength(0)))
                .font(.system(size: 46, weight: .bold, design: .rounded))
                .monospacedDigit()
            Text("Progression globale")
                .font(.title3.weight(.semibold))
            Text("\(snapshot.completedChapters) chapitre\(snapshot.completedChapters > 1 ? "s" : "") terminé\(snapshot.completedChapters > 1 ? "s" : "") sur \(snapshot.totalChapters)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private func globalFacts(_ snapshot: DashboardSnapshot) -> some View {
        HStack(spacing: 24) {
            labelledFact(
                value: "\(snapshot.workedSessions)",
                label: "séances réalisées",
                systemImage: "checkmark.circle.fill"
            )
            labelledFact(
                value: durationLabel(snapshot.periods.last?.minutes ?? 0),
                label: "sur 30 jours",
                systemImage: "clock.fill"
            )
        }
    }

    private func labelledFact(value: String, label: String, systemImage: String) -> some View {
        HStack(alignment: .top, spacing: 9) {
            Image(systemName: systemImage)
                .foregroundStyle(.tint)
                .font(.title2)
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.title2.bold())
                    .monospacedDigit()
                Text(label)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func periodCard(_ period: PeriodSummary) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("\(period.days) jours", systemImage: "calendar")
                    .font(.title3.weight(.semibold))
                Spacer()
                Text("jusqu’à aujourd’hui")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(durationLabel(period.minutes))
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .monospacedDigit()
                    Text("de travail")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 3) {
                    Text("\(period.activeDays)")
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .monospacedDigit()
                    Text("jour\(period.activeDays > 1 ? "s" : "") actif\(period.activeDays > 1 ? "s" : "")")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            ProgressView(value: Double(period.activeDays), total: Double(period.days))
                .tint(.accentColor)
                .accessibilityLabel("Jours actifs sur \(period.days) jours")
                .accessibilityValue("\(period.activeDays) sur \(period.days)")
        }
        .padding(18)
        .background(.background, in: RoundedRectangle(cornerRadius: 14))
    }

    private func trendCard(_ trend: TrendSummary) -> some View {
        let direction = trendDirection(trend)

        return VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: direction.symbol)
                    .font(.title.weight(.semibold))
                    .foregroundStyle(direction.color)
                    .frame(width: 44, height: 44)
                    .background(direction.color.opacity(0.12), in: RoundedRectangle(cornerRadius: 11))

                VStack(alignment: .leading, spacing: 4) {
                    Text("Tendance sur 30 jours")
                        .font(.title3.weight(.semibold))
                    Text(direction.message)
                        .foregroundStyle(direction.color)
                        .font(.subheadline.weight(.semibold))
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 3) {
                    Text(durationLabel(trend.currentMinutes))
                        .font(.title.bold())
                        .monospacedDigit()
                    Text("période actuelle")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Divider()

            HStack(spacing: 28) {
                trendComparison(
                    title: "30 jours actuels",
                    minutes: trend.currentMinutes,
                    activeDays: trend.currentActiveDays
                )
                trendComparison(
                    title: "30 jours précédents",
                    minutes: trend.previousMinutes,
                    activeDays: trend.previousActiveDays
                )
            }
        }
        .padding(20)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
    }

    private func trendComparison(title: String, minutes: Int, activeDays: Int) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("\(durationLabel(minutes)) · \(activeDays) j actif\(activeDays > 1 ? "s" : "")")
                .font(.subheadline.weight(.medium))
        }
    }

    private func domainChart(_ domains: [DomainSummary]) -> some View {
        Group {
            if domains.allSatisfy({ $0.minutes == 0 }) {
                emptyChart(
                    systemImage: "chart.bar.xaxis",
                    title: "Aucun temps enregistré",
                    description: "Les minutes apparaîtront ici après la première séance chronométrée."
                )
            } else {
                Chart(domains) { summary in
                    BarMark(
                        x: .value("Minutes", summary.minutes),
                        y: .value("Domaine", summary.domain.title)
                    )
                    .foregroundStyle(AppTheme.color(for: summary.domain))
                    .cornerRadius(6)
                    .annotation(position: .trailing, alignment: .leading) {
                        Text(durationLabel(summary.minutes))
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                }
                .chartXAxis {
                    AxisMarks(position: .bottom) { value in
                        AxisGridLine()
                        AxisTick()
                        AxisValueLabel {
                            if let minutes = value.as(Int.self) {
                                Text(durationLabel(minutes))
                            }
                        }
                    }
                }
                .chartYAxis {
                    AxisMarks(position: .leading)
                }
                .frame(height: 220)
                .padding(18)
                .background(.background, in: RoundedRectangle(cornerRadius: 16))
            }
        }
    }

    private func domainDetailGrid(_ domains: [DomainSummary]) -> some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: 220), spacing: 14)],
            spacing: 14
        ) {
            ForEach(domains) { summary in
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        DomainBadge(domain: summary.domain)
                        Spacer()
                        Text(durationLabel(summary.minutes))
                            .font(.title3.bold())
                            .monospacedDigit()
                    }
                    ProgressView(value: summary.progress)
                        .tint(AppTheme.color(for: summary.domain))
                        .scaleEffect(x: 1, y: 1.4, anchor: .center)
                        .padding(.vertical, 2)
                    Text("\(summary.completedChapters) / \(summary.totalChapters) chapitres terminés")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(16)
                .background(.background, in: RoundedRectangle(cornerRadius: 14))
            }
        }
    }

    private func activityChart(_ activity: [DailyActivity]) -> some View {
        Group {
            if activity.allSatisfy({ $0.minutes == 0 }) {
                emptyChart(
                    systemImage: "waveform.path.ecg",
                    title: "Pas encore d’activité récente",
                    description: "La série quotidienne couvrira automatiquement les 30 derniers jours."
                )
            } else {
                Chart(activity) { day in
                    AreaMark(
                        x: .value("Jour", day.date),
                        y: .value("Minutes", day.minutes)
                    )
                    .interpolationMethod(.catmullRom)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.accentColor.opacity(0.35), Color.accentColor.opacity(0.03)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                    LineMark(
                        x: .value("Jour", day.date),
                        y: .value("Minutes", day.minutes)
                    )
                    .interpolationMethod(.catmullRom)
                    .foregroundStyle(Color.accentColor)
                    .lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))

                    if day.minutes > 0 {
                        PointMark(
                            x: .value("Jour", day.date),
                            y: .value("Minutes", day.minutes)
                        )
                        .foregroundStyle(Color.accentColor)
                        .symbolSize(24)
                    }
                }
                .chartXAxis {
                    AxisMarks(values: .stride(by: .day, count: 5)) { _ in
                        AxisGridLine().foregroundStyle(.quaternary)
                        AxisTick()
                        AxisValueLabel(format: .dateTime.day().month(.abbreviated))
                    }
                }
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisGridLine()
                        AxisTick()
                        AxisValueLabel {
                            if let minutes = value.as(Int.self) {
                                Text("\(minutes) min")
                            }
                        }
                    }
                }
                .frame(height: 280)
                .padding(18)
                .background(.background, in: RoundedRectangle(cornerRadius: 16))
                .accessibilityLabel("Activité quotidienne sur les 30 derniers jours")
            }
        }
    }

    private func emptyChart(systemImage: String, title: String, description: String) -> some View {
        ContentUnavailableView(
            title,
            systemImage: systemImage,
            description: Text(description)
        )
        .frame(maxWidth: .infinity, minHeight: 210)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
    }

    private func sectionTitle(_ title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.title2.bold())
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private func makeSnapshot(at now: Date) -> DashboardSnapshot {
        let calendar = guadeloupeCalendar
        let today = calendar.startOfDay(for: now)
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: today) ?? now
        let currentStart = calendar.date(byAdding: .day, value: -29, to: today) ?? today
        let previousStart = calendar.date(byAdding: .day, value: -30, to: currentStart) ?? currentStart

        let periods = [14, 21, 30].map { days in
            let start = calendar.date(byAdding: .day, value: -(days - 1), to: today) ?? today
            let matching = activities(from: start, to: tomorrow)
            return PeriodSummary(
                days: days,
                minutes: matching.reduce(0) { $0 + max(0, $1.minutes) },
                activeDays: activeDayCount(in: matching, calendar: calendar)
            )
        }

        let currentActivities = activities(from: currentStart, to: tomorrow)
        let previousActivities = activities(from: previousStart, to: currentStart)

        let domainSummaries = StudyDomainKind.allCases.map { domain in
            let chapters = store.chapters.filter { $0.domain == domain }
            return DomainSummary(
                domain: domain,
                minutes: currentActivities
                    .filter { $0.domain == domain }
                    .reduce(0) { $0 + max(0, $1.minutes) },
                completedChapters: chapters.filter { $0.status == .done }.count,
                totalChapters: chapters.count
            )
        }

        let dailyActivity = (0..<30).map { offset in
            let date = calendar.date(byAdding: .day, value: offset, to: currentStart) ?? currentStart
            let nextDate = calendar.date(byAdding: .day, value: 1, to: date) ?? tomorrow
            return DailyActivity(
                date: date,
                minutes: activities(from: date, to: nextDate)
                    .reduce(0) { $0 + max(0, $1.minutes) }
            )
        }

        return DashboardSnapshot(
            completedChapters: store.chapters.filter { $0.status == .done }.count,
            totalChapters: store.chapters.count,
            workedSessions: store.sessions.filter(\.isWorked).count,
            periods: periods,
            trend: TrendSummary(
                currentMinutes: currentActivities.reduce(0) { $0 + max(0, $1.minutes) },
                previousMinutes: previousActivities.reduce(0) { $0 + max(0, $1.minutes) },
                currentActiveDays: activeDayCount(in: currentActivities, calendar: calendar),
                previousActiveDays: activeDayCount(in: previousActivities, calendar: calendar)
            ),
            domains: domainSummaries,
            dailyActivity: dailyActivity,
            currentPeriodStart: currentStart
        )
    }

    private func activities(from start: Date, to end: Date) -> [StudyActivity] {
        store.activities.filter {
            $0.kind != .sportWorked && $0.occurredAt >= start && $0.occurredAt < end
        }
    }

    private func activeDayCount(in activities: [StudyActivity], calendar: Calendar) -> Int {
        Set(
            activities
                .filter { $0.minutes > 0 }
                .map { calendar.startOfDay(for: $0.occurredAt) }
        ).count
    }

    private func trendDirection(_ trend: TrendSummary) -> (symbol: String, color: Color, message: String) {
        guard let change = trend.percentageChange else {
            return (
                "arrow.up.right",
                .green,
                "Première activité enregistrée après une période sans minutes"
            )
        }

        if abs(change) < 0.005 {
            return ("arrow.right", .secondary, "Volume stable par rapport aux 30 jours précédents")
        }

        let formatted = abs(change).formatted(.percent.precision(.fractionLength(0)))
        if change > 0 {
            return ("arrow.up.right", .green, "+\(formatted) de minutes par rapport à la période précédente")
        }
        return ("arrow.down.right", .orange, "−\(formatted) de minutes par rapport à la période précédente")
    }

    private func durationLabel(_ minutes: Int) -> String {
        let safeMinutes = max(0, minutes)
        let hours = safeMinutes / 60
        let remainder = safeMinutes % 60

        if hours == 0 { return "\(remainder) min" }
        if remainder == 0 { return "\(hours) h" }
        return "\(hours) h \(String(format: "%02d", remainder))"
    }
}
