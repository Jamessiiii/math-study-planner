import SwiftUI

/// Écran d'accueil « Aujourd'hui » : prochaine séance, action principale,
/// progression du jour et onboarding causal en trois liens.
struct TodayFeatureView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var commandRouter: AppCommandRouter

    /// Navigation vers une autre section de l'application (fournie par RootView).
    var onNavigate: (AppSection) -> Void = { _ in }

    @State private var now = Date()
    @State private var isCompletionPresented = false
    @State private var confirmsAbandon = false
    private let minuteClock = Timer.publish(every: 60, on: .main, in: .common).autoconnect()
    private let activeClock = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    // MARK: - Données dérivées

    private var todaySessions: [StudySession] {
        store.sessions
            .filter { WeekCycle.calendar.isDate($0.startAt, inSameDayAs: now) }
            .sorted { $0.startAt < $1.startAt }
    }

    private var upcomingContext: UpcomingCourseContext? {
        UpcomingCourseService.currentOrNextCourse(
            sessions: store.sessions,
            chapters: store.chapters,
            now: now,
            horizonEnd: UpcomingCourseService.horizonEnd(from: now)
        )
    }

    /// Séance mise en avant : cours en cours, sinon prochain cours sur
    /// l’horizon partagé, sinon dernière séance du jour à clôturer.
    private var focusSession: StudySession? {
        if let upcomingContext { return upcomingContext.session }
        return todaySessions.last(where: { !$0.isWorked && $0.endAt <= now })
            ?? todaySessions.last
    }

    private var focusChapter: StudyChapter? {
        guard let session = focusSession else { return nil }
        return UpcomingCourseService.chapter(for: session, in: store.chapters)
    }

    private var plannedMinutesToday: Int {
        todaySessions.filter { $0.kind == .course }.reduce(0) { $0 + $1.durationMinutes }
    }

    private var workedMinutesToday: Int {
        todaySessions.filter { $0.kind == .course && $0.isWorked }.reduce(0) { $0 + $1.workedMinutes }
    }

    private var dayProgress: Double {
        guard plannedMinutesToday > 0 else { return 0 }
        return min(1, Double(workedMinutesToday) / Double(plannedMinutesToday))
    }

    private var weekKind: WeekKind { WeekCycle.kind(for: now) }

    private var dayTitle: String {
        let formatter = DateFormatter()
        formatter.calendar = WeekCycle.calendar
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.timeZone = WeekCycle.timeZone
        formatter.dateFormat = "EEEE d MMMM"
        return formatter.string(from: now).capitalized(with: Locale(identifier: "fr_FR"))
    }

    // MARK: - Corps

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 26) {
                header
                if store.activeStudySession != nil {
                    activeSessionCard
                } else {
                    nextSessionCard
                }
                dayProgressCard
                onboardingCard
                localDataFooter
            }
            .padding(28)
            .frame(maxWidth: 680, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .navigationTitle("Aujourd’hui")
        .onAppear {
            now = Date()
            store.ensurePlanningHorizon(from: now, weeksAhead: UpcomingCourseService.defaultWeeksAhead)
        }
        .onReceive(minuteClock) { if store.activeStudySession == nil { now = $0 } }
        .onReceive(activeClock) { if store.activeStudySession != nil { now = $0 } }
        .onChange(of: commandRouter.request) { _, request in
            if request.opensSessionCompletion && store.activeStudySession != nil {
                isCompletionPresented = true
            }
        }
        .sheet(isPresented: $isCompletionPresented) {
            SessionCompletionSheet()
                .environmentObject(store)
        }
        .confirmationDialog(
            "Abandonner cette séance ?",
            isPresented: $confirmsAbandon,
            titleVisibility: .visible
        ) {
            Button("Abandonner sans enregistrer", role: .destructive) {
                store.abandonActiveStudySession()
            }
            Button("Continuer la séance", role: .cancel) {}
        } message: {
            Text("Le temps de cette séance ne sera pas ajouté aux statistiques.")
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(dayTitle)
                .font(.largeTitle.bold())
            Text("\(weekKind.title) · l’alternance A/B est automatique")
                .font(.headline)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Prochaine séance et action principale

    @ViewBuilder
    private var activeSessionCard: some View {
        if let active = store.activeStudySession {
            card {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Label("Séance active", systemImage: active.isPaused ? "pause.circle.fill" : "timer")
                            .font(.headline)
                            .foregroundStyle(AppTheme.color(for: active.domain))
                        Spacer()
                        Text(active.isPaused ? "En pause" : "En cours")
                            .font(.callout.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }

                    Text(active.domain.title)
                        .font(.title2.bold())
                    if let chapter = active.chapterID.flatMap({ id in store.chapters.first { $0.id == id } }) {
                        Label("\(chapter.blockTitle) — \(chapter.title)", systemImage: "book")
                            .foregroundStyle(.secondary)
                    }

                    Text(StudyTimerFormatting.duration(seconds: active.activeSeconds(at: now)))
                        .font(.system(size: 46, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .accessibilityLabel("Temps actif \(StudyTimerFormatting.duration(seconds: active.activeSeconds(at: now)))")

                    HStack(spacing: 12) {
                        Button {
                            if active.isPaused {
                                store.resumeActiveStudySession()
                            } else {
                                store.pauseActiveStudySession()
                            }
                        } label: {
                            Label(active.isPaused ? "Reprendre" : "Pause", systemImage: active.isPaused ? "play.fill" : "pause.fill")
                        }
                        .buttonStyle(.borderedProminent)

                        Button("Terminer…") { isCompletionPresented = true }
                            .buttonStyle(.bordered)

                        Spacer()

                        Button("Abandonner", role: .destructive) { confirmsAbandon = true }
                            .buttonStyle(.borderless)
                    }
                    .controlSize(.large)
                }
            }
        }
    }

    @ViewBuilder
    private var nextSessionCard: some View {
        card {
            if let session = focusSession {
                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        SessionBadge(session: session)
                        Spacer()
                        Text(sessionTimeRange(session))
                            .font(.body.monospacedDigit())
                            .foregroundStyle(.secondary)
                    }
                    Text(session.title)
                        .font(.title2.bold())
                    if session.kind == .course, let chapter = focusChapter {
                        Label {
                            Text("\(chapter.blockTitle) — \(chapter.title)")
                        } icon: {
                            Image(systemName: "book")
                        }
                        .font(.body)
                        .foregroundStyle(.secondary)
                    }
                    sessionAction(session)
                }
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    Label("Aucune séance prévue aujourd’hui", systemImage: "moon.zzz")
                        .font(.title2.bold())
                    Text("Le Programme génère les séances des semaines à venir. Ajoutez ou ajustez vos créneaux depuis le Calendrier.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                    Button("Ouvrir le calendrier") { onNavigate(.calendar) }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                }
            }
        }
    }

    @ViewBuilder
    private func sessionAction(_ session: StudySession) -> some View {
        if session.isWorked {
            Label("Séance travaillée — comptée dans les Statistiques", systemImage: "checkmark.circle.fill")
                .foregroundStyle(.green)
                .font(.body.weight(.semibold))
        } else if session.kind == .course {
            VStack(alignment: .leading, spacing: 10) {
                if session.endAt <= now {
                    Text("Cette séance planifiée est terminée.")
                        .foregroundStyle(.secondary)
                } else if session.startAt <= now {
                    Label("Créneau en cours", systemImage: "clock")
                        .foregroundStyle(AppTheme.color(for: session))
                } else {
                    Label("Commence \(upcomingStartLabel(session.startAt))", systemImage: "clock")
                        .foregroundStyle(.secondary)
                }
                Button {
                    store.startStudySession(sessionID: session.id)
                } label: {
                    Label(session.startAt > now ? "Commencer maintenant" : "Commencer la séance", systemImage: "play.fill")
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .tint(AppTheme.color(for: session))
                .disabled(!store.canStartStudySession(session, at: now))
                if !store.canStartStudySession(session, at: now) {
                    Text("Le minuteur sera disponible quinze minutes avant le cours.")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                } else if session.endAt <= now {
                    Button("Marquer comme travaillée sans minuteur") {
                        store.setSessionWorked(id: session.id, worked: true)
                    }
                    .buttonStyle(.borderless)
                }
            }
        } else if session.endAt <= now {
            // Action principale : uniquement une fois la séance réellement terminée.
            Button {
                store.setSessionWorked(id: session.id, worked: true)
            } label: {
                Label("Marquer la séance travaillée", systemImage: "checkmark.circle")
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .tint(AppTheme.color(for: session))
        } else if session.startAt <= now {
            HStack(spacing: 12) {
                Label("Séance en cours", systemImage: "timer")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(AppTheme.color(for: session))
                Text("Vous pourrez la marquer travaillée à la fin.")
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
        } else {
            Label("Commence \(upcomingStartLabel(session.startAt))", systemImage: "clock")
                .font(.body)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Progression du jour

    private var dayProgressCard: some View {
        card {
            VStack(alignment: .leading, spacing: 12) {
                Text("Progression du jour")
                    .font(.title3.bold())
                if plannedMinutesToday > 0 {
                    ProgressView(value: dayProgress)
                        .tint(dayProgress >= 1 ? .green : .accentColor)
                        .controlSize(.large)
                    Text("\(minutesLabel(workedMinutesToday)) travaillées sur \(minutesLabel(plannedMinutesToday)) prévues")
                        .font(.body)
                        .foregroundStyle(.secondary)
                } else {
                    Text("Aucun temps de cours prévu aujourd’hui.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
                Button { onNavigate(.progress) } label: {
                    Label("Voir la progression du cursus", systemImage: "chart.line.uptrend.xyaxis")
                        .font(.body.weight(.semibold))
                        .fullWidthHitTarget()
                }
                .buttonStyle(.plain)
                .foregroundStyle(Color.accentColor)
            }
        }
    }

    // MARK: - Onboarding causal

    private var onboardingCard: some View {
        card {
            VStack(alignment: .leading, spacing: 16) {
                Text("Comment l’application fonctionne")
                    .font(.title3.bold())
                onboardingRow(
                    symbol: "arrow.triangle.2.circlepath",
                    text: "Les semaines A et B alternent automatiquement : chaque jour a son domaine.",
                    linkTitle: "Voir la semaine dans le Calendrier",
                    target: .calendar
                )
                onboardingRow(
                    symbol: "slider.horizontal.3",
                    text: "Le Programme définit vos créneaux et génère les futures semaines du Calendrier.",
                    linkTitle: "Régler le Programme",
                    target: .programme
                )
                onboardingRow(
                    symbol: "chart.bar.xaxis",
                    text: "Marquer une séance « travaillée » alimente les Statistiques datées.",
                    linkTitle: "Ouvrir les Statistiques",
                    target: .statistics
                )
            }
        }
    }

    private func onboardingRow(
        symbol: String,
        text: String,
        linkTitle: String,
        target: AppSection
    ) -> some View {
        // Toute la ligne est un unique bouton : pas de geste concurrent imbriqué.
        Button {
            onNavigate(target)
        } label: {
            HStack(alignment: .firstTextBaseline, spacing: 14) {
                Image(systemName: symbol)
                    .font(.title3)
                    .frame(width: 26)
                    .foregroundStyle(.secondary)
                VStack(alignment: .leading, spacing: 4) {
                    Text(text)
                        .font(.body)
                        .foregroundStyle(.primary)
                    Label(linkTitle, systemImage: "arrow.right")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(Color.accentColor)
                }
                Spacer(minLength: 0)
            }
            .fullWidthHitTarget()
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(text). \(linkTitle)")
        .accessibilityAddTraits(.isButton)
    }

    // MARK: - Données locales

    private var localDataFooter: some View {
        Label {
            Text("Toutes vos données restent sur ce Mac, dans un fichier local. Aucun compte, aucun envoi vers un serveur.")
        } icon: {
            Image(systemName: "internaldrive")
        }
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }

    // MARK: - Aides

    private func card<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(.quaternary.opacity(0.4), in: RoundedRectangle(cornerRadius: 14))
    }

    private func sessionTimeRange(_ session: StudySession) -> String {
        let times = "\(PlanningSlot.timeLabel(minutes: minutesOfDay(session.startAt))) – \(PlanningSlot.timeLabel(minutes: minutesOfDay(session.endAt)))"
        guard !WeekCycle.calendar.isDate(session.startAt, inSameDayAs: now) else { return times }
        let formatter = DateFormatter()
        formatter.calendar = WeekCycle.calendar
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.timeZone = WeekCycle.timeZone
        formatter.dateFormat = "EEE d MMM"
        return "\(formatter.string(from: session.startAt).capitalized(with: formatter.locale)) · \(times)"
    }

    private func upcomingStartLabel(_ date: Date) -> String {
        let time = PlanningSlot.timeLabel(minutes: minutesOfDay(date))
        if WeekCycle.calendar.isDate(date, inSameDayAs: now) { return "à \(time)" }
        let formatter = DateFormatter()
        formatter.calendar = WeekCycle.calendar
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.timeZone = WeekCycle.timeZone
        formatter.dateFormat = "EEEE d MMMM"
        return "\(formatter.string(from: date)) à \(time)"
    }

    private func minutesOfDay(_ date: Date) -> Int {
        let components = WeekCycle.calendar.dateComponents([.hour, .minute], from: date)
        return (components.hour ?? 0) * 60 + (components.minute ?? 0)
    }

    private func minutesLabel(_ minutes: Int) -> String {
        let hours = minutes / 60
        let rest = minutes % 60
        if hours == 0 { return "\(rest) min" }
        if rest == 0 { return "\(hours) h" }
        return "\(hours) h \(String(format: "%02d", rest))"
    }
}
