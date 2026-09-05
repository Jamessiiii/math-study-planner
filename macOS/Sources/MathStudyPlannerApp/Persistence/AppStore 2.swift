import Combine
import Foundation

@MainActor
final class AppStore: ObservableObject {
    @Published private(set) var chapters: [StudyChapter]
    @Published private(set) var sessions: [StudySession]

    private struct Snapshot: Codable {
        var chapters: [StudyChapter]
        var sessions: [StudySession]
    }

    private let fileURL: URL

    init(fileURL: URL? = nil) {
        self.fileURL = fileURL ?? Self.defaultFileURL
        if let data = try? Data(contentsOf: self.fileURL),
           let snapshot = try? JSONDecoder().decode(Snapshot.self, from: data) {
            chapters = snapshot.chapters
            sessions = snapshot.sessions
        } else {
            chapters = SeedData.chapters()
            sessions = SeedData.sessions()
            save()
        }
    }

    func updateStatus(of chapterID: String, to status: ChapterStatus) {
        guard let index = chapters.firstIndex(where: { $0.id == chapterID }) else { return }
        chapters[index].statusRawValue = status.rawValue
        chapters[index].completedAt = status == .done ? (chapters[index].completedAt ?? Date()) : nil
        chapters[index].updatedAt = Date()
        save()
    }

    func save() {
        let snapshot = Snapshot(chapters: chapters, sessions: sessions)
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        try? FileManager.default.createDirectory(
            at: fileURL.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        try? data.write(to: fileURL, options: .atomic)
    }

    private static var defaultFileURL: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        return base
            .appendingPathComponent("MathStudyPlanner", isDirectory: true)
            .appendingPathComponent("planner.json")
    }
}
