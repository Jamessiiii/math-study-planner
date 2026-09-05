import Foundation

struct UpcomingCourseContext: Equatable {
    enum State: Equatable {
        case inProgress
        case upcoming
    }

    let session: StudySession
    let chapter: StudyChapter?
    let state: State
}

enum UpcomingCourseService {
    static let defaultWeeksAhead = 2

    static func currentOrNextCourse(
        sessions: [StudySession],
        chapters: [StudyChapter],
        now: Date,
        horizonEnd: Date? = nil
    ) -> UpcomingCourseContext? {
        let courses = sessions
            .filter { session in
                session.kind == .course
                    && !session.isWorked
                    && session.endAt > now
                    && (horizonEnd.map { session.startAt < $0 } ?? true)
            }
            .sorted {
                if $0.startAt == $1.startAt { return $0.id.uuidString < $1.id.uuidString }
                return $0.startAt < $1.startAt
            }

        guard let session = courses.first(where: { $0.startAt <= now && now < $0.endAt })
            ?? courses.first(where: { $0.startAt > now }) else { return nil }

        let chapter = chapter(for: session, in: chapters)
        let state: UpcomingCourseContext.State = session.startAt <= now ? .inProgress : .upcoming
        return UpcomingCourseContext(session: session, chapter: chapter, state: state)
    }

    static func chapter(for session: StudySession, in chapters: [StudyChapter]) -> StudyChapter? {
        if let chapterID = session.chapterID,
           let chapter = chapters.first(where: { $0.id == chapterID }) {
            return chapter
        }
        return chapters
            .filter { $0.domain == session.domain && $0.status != .done }
            .sorted { $0.sequence < $1.sequence }
            .first
    }

    static func horizonEnd(from now: Date, weeksAhead: Int = defaultWeeksAhead) -> Date {
        let start = WeekCycle.monday(containing: now)
        return WeekCycle.calendar.date(byAdding: .day, value: (weeksAhead + 1) * 7, to: start)
            ?? now.addingTimeInterval(TimeInterval((weeksAhead + 1) * 7 * 86_400))
    }
}
