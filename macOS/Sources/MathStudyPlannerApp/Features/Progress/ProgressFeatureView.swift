import SwiftUI

struct ProgressFeatureView: View {
    @EnvironmentObject private var store: AppStore

    @State private var selectedDomain: StudyDomainKind = .maths
    @State private var selectedProgramID = ""
    @State private var selectedBlockID = ""
    @State private var selectedChapterID: String?

    private struct ProgramChoice: Identifiable {
        let id: String
        let title: String
        let isLocked: Bool
    }

    private struct BlockChoice: Identifiable {
        let id: String
        let title: String
    }

    private var domainChapters: [StudyChapter] {
        store.chapters
            .filter { $0.domain == selectedDomain }
            .sorted { $0.sequence < $1.sequence }
    }

    private var allProgramChoices: [ProgramChoice] {
        var seen = Set<String>()
        let orderedIDs: [(id: String, title: String)] = domainChapters.compactMap { chapter in
            let id = programKey(for: chapter)
            guard seen.insert(id).inserted else { return nil }
            return (id: id, title: chapter.level)
        }
        let currentIndex = currentProgramIndex(in: orderedIDs.map(\.id))
        return orderedIDs.enumerated().map { index, entry in
            ProgramChoice(
                id: entry.id,
                title: entry.title,
                isLocked: currentIndex.map { index > $0 } ?? false
            )
        }
    }

    private var currentProgramID: String? {
        domainChapters.first(where: { $0.status != .done }).map(programKey(for:))
    }

    private func currentProgramIndex(in orderedIDs: [String]) -> Int? {
        guard let currentProgramID else {
            // Everything is done: nothing is locked anymore.
            return orderedIDs.isEmpty ? nil : orderedIDs.count - 1
        }
        return orderedIDs.firstIndex(of: currentProgramID)
    }

    private var programChapters: [StudyChapter] {
        domainChapters.filter { programKey(for: $0) == selectedProgramID }
    }

    private var blockChoices: [BlockChoice] {
        var seen = Set<String>()
        return programChapters.compactMap { chapter in
            let id = blockKey(for: chapter)
            guard seen.insert(id).inserted else { return nil }
            return BlockChoice(id: id, title: chapter.blockTitle)
        }
    }

    private var blockChapters: [StudyChapter] {
        programChapters.filter { blockKey(for: $0) == selectedBlockID }
    }

    private var currentBlockID: String? {
        let firstUnfinished = blockChoices.first { block in
            programChapters.contains { blockKey(for: $0) == block.id && $0.status != .done }
        }
        return firstUnfinished?.id ?? blockChoices.last?.id
    }

    private var selectedChapter: StudyChapter? {
        guard let selectedChapterID else { return nil }
        return store.chapters.first { $0.id == selectedChapterID }
    }

    private var blockCompletedCount: Int {
        blockChapters.filter { $0.status == .done }.count
    }

    private var blockCompletionRatio: Double {
        guard !blockChapters.isEmpty else { return 0 }
        return Double(blockCompletedCount) / Double(blockChapters.count)
    }

    private var cursusCompletedCount: Int {
        programChapters.filter { $0.status == .done }.count
    }

    private var cursusCompletionRatio: Double {
        guard !programChapters.isEmpty else { return 0 }
        return Double(cursusCompletedCount) / Double(programChapters.count)
    }

    private var selectedBlockTitle: String {
        blockChoices.first(where: { $0.id == selectedBlockID })?.title ?? "Bloc"
    }

    private var selectedProgramTitle: String {
        allProgramChoices.first(where: { $0.id == selectedProgramID })?.title ?? "Cursus"
    }

    var body: some View {
        VStack(spacing: 0) {
            filters
            Divider()

            if programChapters.isEmpty {
                ContentUnavailableView(
                    "Cursus indisponible",
                    systemImage: "books.vertical",
                    description: Text("Aucun chapitre n’est disponible pour cette sélection.")
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                HStack(spacing: 0) {
                    chapterList
                    Divider()
                    chapterDetail
                }
            }
        }
        .navigationTitle("Progression")
        .onAppear { selectInitialProgramme() }
        .onChange(of: selectedDomain) { _, _ in selectInitialProgramme() }
        .onChange(of: selectedProgramID) { _, _ in selectCurrentBlock() }
        .onChange(of: selectedBlockID) { _, _ in selectDefaultChapter() }
    }

    private var filters: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Progression")
                        .font(.title2.bold())
                    Text("Choisissez un cursus, puis avancez chapitre par chapitre.")
                        .foregroundStyle(.secondary)
                }
                Spacer()
                DomainBadge(domain: selectedDomain)
            }

            Picker("Domaine", selection: $selectedDomain) {
                ForEach(StudyDomainKind.allCases) { domain in
                    Text(domain.title).tag(domain)
                }
            }
            .pickerStyle(.segmented)
            .controlSize(.large)
            .frame(maxWidth: 620)

            // Retour à la ligne automatique sous 980×680 : une rangée si la
            // largeur le permet, sinon empilement vertical.
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .bottom, spacing: 16) {
                    cursusPicker
                    blocPicker
                    currentBlockButton
                }
                VStack(alignment: .leading, spacing: 16) {
                    HStack(alignment: .bottom, spacing: 16) {
                        cursusPicker
                        blocPicker
                    }
                    currentBlockButton
                }
            }
        }
        .padding(24)
    }

    private var cursusPicker: some View {
        labelledPicker("Cursus") {
            Picker("Cursus", selection: $selectedProgramID) {
                ForEach(allProgramChoices) { choice in
                    if choice.isLocked {
                        Label("\(choice.title) — verrouillé", systemImage: "lock.fill")
                            .tag(choice.id)
                            .selectionDisabled(true)
                    } else {
                        Text(choice.title).tag(choice.id)
                    }
                }
            }
            .labelsHidden()
            .controlSize(.large)
            .frame(minWidth: 240)
            .comfortableHitTarget()
            .help("Les cursus futurs se déverrouillent quand le cursus courant est terminé.")
        }
    }

    private var blocPicker: some View {
        labelledPicker("Bloc") {
            Picker("Bloc", selection: $selectedBlockID) {
                ForEach(blockChoices) { block in
                    Text(block.title).tag(block.id)
                }
            }
            .labelsHidden()
            .controlSize(.large)
            .frame(minWidth: 280)
            .comfortableHitTarget()
        }
    }

    private var currentBlockButton: some View {
        Button {
            selectCurrentBlock()
        } label: {
            Label("Revenir au bloc courant", systemImage: "scope")
                .comfortableHitTarget()
        }
        .buttonStyle(.bordered)
        .controlSize(.large)
        .disabled(currentBlockID == nil)
        .help("Sélectionne le premier bloc contenant un chapitre non terminé.")
    }

    private func labelledPicker<Content: View>(
        _ title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            content()
        }
    }

    private var chapterList: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 16) {
                progressGauge(
                    title: "Bloc courant · \(selectedBlockTitle)",
                    done: blockCompletedCount,
                    total: blockChapters.count,
                    ratio: blockCompletionRatio
                )
                progressGauge(
                    title: "Cursus \(selectedProgramTitle)",
                    done: cursusCompletedCount,
                    total: programChapters.count,
                    ratio: cursusCompletionRatio
                )
            }
            .padding(18)

            Divider()

            List(selection: $selectedChapterID) {
                ForEach(blockChapters) { chapter in
                    chapterRow(chapter)
                        .tag(chapter.id)
                }
            }
            .listStyle(.inset)
            .scrollContentBackground(.hidden)
            .accessibilityLabel("Chapitres du bloc \(selectedBlockTitle)")
        }
        .frame(minWidth: 320, idealWidth: 360, maxWidth: 400, maxHeight: .infinity)
        .background(Color(nsColor: .controlBackgroundColor).opacity(0.45))
    }

    private func progressGauge(title: String, done: Int, total: Int, ratio: Double) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .firstTextBaseline) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(2)
                Spacer()
                Text("\(done)/\(total)")
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            ProgressView(value: ratio)
                .tint(AppTheme.color(for: selectedDomain))
                .scaleEffect(x: 1, y: 1.4, anchor: .center)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title) : \(done) chapitres terminés sur \(total)")
    }

    private func chapterRow(_ chapter: StudyChapter) -> some View {
        HStack(spacing: 12) {
            Image(systemName: statusSymbol(for: chapter.status))
                .foregroundStyle(statusColor(for: chapter.status))
                .font(.body)
                .frame(width: 22)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text(chapter.title)
                    .font(.body.weight(.medium))
                    .lineLimit(2)
                HStack(spacing: 8) {
                    Text(chapter.status.title)
                    Text("•")
                    Text(chapter.masteryLevel.title)
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer(minLength: 4)
        }
        .padding(.vertical, 6)
        .fullWidthHitTarget()
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(chapter.title), \(chapter.status.title), maîtrise \(chapter.masteryLevel.title)")
        .contextMenu {
            statusMenuContent(for: chapter)
        }
    }

    @ViewBuilder
    private func statusMenuContent(for chapter: StudyChapter) -> some View {
        ForEach(ChapterStatus.allCases) { status in
            Button {
                store.updateStatus(of: chapter.id, to: status)
            } label: {
                if status == chapter.status {
                    Label(status.title, systemImage: "checkmark")
                } else {
                    Label(status.title, systemImage: statusSymbol(for: status))
                }
            }
            .disabled(status == chapter.status)
        }
    }

    @ViewBuilder
    private var chapterDetail: some View {
        if let chapter = selectedChapter {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    HStack {
                        DomainBadge(domain: chapter.domain)
                        Text(chapter.level)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.secondary)
                        Spacer()
                        Label("\(chapter.estimatedHours) h estimées", systemImage: "clock")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text(chapter.title)
                            .font(.largeTitle.bold())
                            .textSelection(.enabled)
                        Text(chapter.summary)
                            .font(.title3)
                            .foregroundStyle(.secondary)
                            .textSelection(.enabled)
                    }

                    Divider()

                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("Statut du chapitre")
                                .font(.headline)
                            Spacer()
                            if chapter.status != .done {
                                Button {
                                    store.updateStatus(of: chapter.id, to: .done)
                                } label: {
                                    Label("Marquer comme fait", systemImage: "checkmark.circle.fill")
                                        .comfortableHitTarget()
                                }
                                .buttonStyle(.borderedProminent)
                                .controlSize(.large)
                                .tint(.green)
                            }
                        }
                        Picker("Statut", selection: statusBinding(for: chapter.id)) {
                            ForEach(ChapterStatus.allCases) { status in
                                Label(status.title, systemImage: statusSymbol(for: status)).tag(status)
                            }
                        }
                        .pickerStyle(.segmented)
                        .controlSize(.large)
                        .labelsHidden()
                        if let completedAt = chapter.completedAt {
                            Text("Première complétion le \(completedAt.formatted(date: .abbreviated, time: .omitted))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("Maîtrise")
                                .font(.headline)
                            Spacer()
                            Text(chapter.masteryLevel.title)
                                .foregroundStyle(.secondary)
                        }
                        Picker("Maîtrise", selection: masteryBinding(for: chapter.id)) {
                            ForEach(MasteryLevel.allCases) { level in
                                Text(level.title).tag(level)
                            }
                        }
                        .pickerStyle(.segmented)
                        .controlSize(.large)
                        .labelsHidden()
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Révision")
                            .font(.headline)
                        ViewThatFits(in: .horizontal) {
                            HStack(alignment: .firstTextBaseline, spacing: 14) {
                                markReviewedButton(for: chapter)
                                lastReviewedLabel(for: chapter)
                            }
                            VStack(alignment: .leading, spacing: 10) {
                                markReviewedButton(for: chapter)
                                lastReviewedLabel(for: chapter)
                            }
                        }
                    }

                    if let resources = chapter.resources, !resources.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Ressources")
                                .font(.headline)
                            ForEach(resources, id: \.self) { resource in
                                Label(resource, systemImage: "book.closed")
                                    .foregroundStyle(.secondary)
                                    .textSelection(.enabled)
                            }
                        }
                    }
                }
                .padding(28)
                .frame(maxWidth: 900, alignment: .leading)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ContentUnavailableView(
                "Sélectionnez un chapitre",
                systemImage: "book.pages",
                description: Text("Son statut, sa maîtrise et ses révisions seront modifiables ici.")
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func statusBinding(for chapterID: String) -> Binding<ChapterStatus> {
        Binding(
            get: { store.chapters.first(where: { $0.id == chapterID })?.status ?? .todo },
            set: { store.updateStatus(of: chapterID, to: $0) }
        )
    }

    private func markReviewedButton(for chapter: StudyChapter) -> some View {
        Button {
            store.markReviewed(chapterID: chapter.id)
        } label: {
            Label("Marquer comme revu maintenant", systemImage: "arrow.clockwise.circle.fill")
                .comfortableHitTarget()
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .tint(AppTheme.color(for: chapter.domain))
    }

    @ViewBuilder
    private func lastReviewedLabel(for chapter: StudyChapter) -> some View {
        if let lastReviewedAt = chapter.lastReviewedAt {
            Text("Dernière révision : \(lastReviewedAt.formatted(date: .abbreviated, time: .shortened))")
                .font(.callout)
                .foregroundStyle(.secondary)
        } else {
            Text("Aucune révision enregistrée")
                .font(.callout)
                .foregroundStyle(.secondary)
        }
    }

    private func masteryBinding(for chapterID: String) -> Binding<MasteryLevel> {
        Binding(
            get: { store.chapters.first(where: { $0.id == chapterID })?.masteryLevel ?? .notEvaluated },
            set: { store.updateMastery(of: chapterID, to: $0) }
        )
    }

    private func selectInitialProgramme() {
        let unlocked = allProgramChoices.filter { !$0.isLocked }
        if !unlocked.contains(where: { $0.id == selectedProgramID }) {
            selectedProgramID = currentProgramID ?? unlocked.last?.id ?? ""
        } else {
            selectCurrentBlock()
        }
    }

    private func selectCurrentBlock() {
        selectedBlockID = currentBlockID ?? blockChoices.first?.id ?? ""
        selectDefaultChapter()
    }

    private func selectDefaultChapter() {
        guard !blockChapters.contains(where: { $0.id == selectedChapterID }) else { return }
        selectedChapterID = blockChapters.first(where: { $0.status != .done })?.id ?? blockChapters.first?.id
    }

    private func programKey(for chapter: StudyChapter) -> String {
        chapter.programID ?? "legacy:\(chapter.domainRawValue):\(chapter.level)"
    }

    private func blockKey(for chapter: StudyChapter) -> String {
        if let blockIndex = chapter.blockIndex {
            return "index:\(blockIndex)"
        }
        return "title:\(chapter.blockTitle)"
    }

    private func statusSymbol(for status: ChapterStatus) -> String {
        switch status {
        case .todo: "circle"
        case .inProgress: "play.circle.fill"
        case .done: "checkmark.circle.fill"
        case .review: "arrow.clockwise.circle.fill"
        }
    }

    private func statusColor(for status: ChapterStatus) -> Color {
        switch status {
        case .todo: .secondary
        case .inProgress: .blue
        case .done: .green
        case .review: .orange
        }
    }
}
