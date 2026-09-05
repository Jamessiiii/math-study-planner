import SwiftUI

struct ProgressFeatureView: View {
    @EnvironmentObject private var store: AppStore
    @State private var selectedDomain: StudyDomainKind = .maths

    private var visibleChapters: [StudyChapter] {
        store.chapters.filter { $0.domain == selectedDomain }.sorted { $0.sequence < $1.sequence }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Picker("Domaine", selection: $selectedDomain) {
                ForEach(StudyDomainKind.allCases) { domain in
                    Text(domain.title).tag(domain)
                }
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: 520)

            if let chapter = visibleChapters.first {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        DomainBadge(domain: chapter.domain)
                        Text(chapter.level).foregroundStyle(.secondary)
                    }
                    Text(chapter.title).font(.largeTitle.bold())
                    Text(chapter.summary).font(.title3).foregroundStyle(.secondary)
                    Text(chapter.blockTitle).font(.subheadline.weight(.medium))

                    Picker("État", selection: Binding(
                        get: { chapter.status },
                        set: { store.updateStatus(of: chapter.id, to: $0) }
                    )) {
                        ForEach(ChapterStatus.allCases) { status in
                            Text(status.title).tag(status)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.top, 8)
                }
                .padding(24)
                .background(.background, in: RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.08), radius: 10, y: 4)
            } else {
                ContentUnavailableView("Programme à importer", systemImage: "books.vertical", description: Text("Ce domaine sera alimenté depuis data.js."))
            }
            Spacer()
        }
        .padding(24)
        .navigationTitle("Progression")
    }
}
