import Foundation

enum StudyDomainKind: String, Codable, CaseIterable, Identifiable {
    case maths
    case proba
    case info

    var id: String { rawValue }

    var title: String {
        switch self {
        case .maths: "Maths Sup"
        case .proba: "Probabilités"
        case .info: "Informatique"
        }
    }
}

enum ChapterStatus: String, Codable, CaseIterable, Identifiable {
    case todo
    case inProgress
    case done
    case review

    var id: String { rawValue }

    var title: String {
        switch self {
        case .todo: "À faire"
        case .inProgress: "En cours"
        case .done: "Fait"
        case .review: "À revoir"
        }
    }
}

enum SessionKind: String, Codable, CaseIterable, Identifiable {
    case course
    case sport
    case bike

    var id: String { rawValue }

    var title: String {
        switch self {
        case .course: "Cours"
        case .sport: "Sport"
        case .bike: "Vélo"
        }
    }

    var systemImage: String {
        switch self {
        case .course: "book"
        case .sport: "figure.run"
        case .bike: "bicycle"
        }
    }
}

struct StudyChapter: Identifiable, Codable, Hashable {
    var id: String = ""
    var domainRawValue: String = StudyDomainKind.maths.rawValue
    var level: String = ""
    var blockTitle: String = ""
    var title: String = ""
    var summary: String = ""
    var estimatedHours: Int = 0
    var sequence: Int = 0
    var statusRawValue: String = ChapterStatus.todo.rawValue
    var mastery: Int = 0
    var completedAt: Date?
    var lastReviewedAt: Date?
    var updatedAt: Date = Date()
    var programID: String?
    var blockIndex: Int?
    var priority: Int?
    var resources: [String]?

    init(
        id: String,
        domain: StudyDomainKind,
        level: String,
        blockTitle: String,
        title: String,
        summary: String,
        estimatedHours: Int,
        sequence: Int,
        status: ChapterStatus = .todo
    ) {
        self.id = id
        self.domainRawValue = domain.rawValue
        self.level = level
        self.blockTitle = blockTitle
        self.title = title
        self.summary = summary
        self.estimatedHours = estimatedHours
        self.sequence = sequence
        self.statusRawValue = status.rawValue
    }

    var domain: StudyDomainKind {
        get { StudyDomainKind(rawValue: domainRawValue) ?? .maths }
        set { domainRawValue = newValue.rawValue }
    }

    var status: ChapterStatus { ChapterStatus(rawValue: statusRawValue) ?? .todo }
    var masteryLevel: MasteryLevel { MasteryLevel(rawValue: mastery) ?? .notEvaluated }
}

struct StudySession: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var domainRawValue: String = StudyDomainKind.maths.rawValue
    var title: String = ""
    var startAt: Date = Date()
    var endAt: Date = Date()
    var isWorked: Bool = false
    var workedMinutes: Int = 0
    var chapterID: String?
    var notes: String?
    var kindRawValue: String?
    /// `weekPlan` identifies occurrences generated from the recurring A/B model.
    /// Nil keeps older/manual records backward compatible.
    var sourceRawValue: String?
    var generatedWeekKey: String?
    var generatedPlanID: String?
    var generatedDayID: String?
    var generatedSlotID: String?

    init(domain: StudyDomainKind, title: String, startAt: Date, endAt: Date, kind: SessionKind = .course) {
        self.domainRawValue = domain.rawValue
        self.title = title
        self.startAt = startAt
        self.endAt = endAt
        self.kindRawValue = kind.rawValue
    }

    var domain: StudyDomainKind { StudyDomainKind(rawValue: domainRawValue) ?? .maths }
    var kind: SessionKind {
        get { kindRawValue.flatMap(SessionKind.init(rawValue:)) ?? .course }
        set { kindRawValue = newValue.rawValue }
    }

    var durationMinutes: Int {
        max(0, Int(endAt.timeIntervalSince(startAt) / 60))
    }

    var isGeneratedFromWeekPlan: Bool { sourceRawValue == "weekPlan" }

    mutating func markGenerated(weekKey: String, planID: String, dayID: String, slotID: String) {
        sourceRawValue = "weekPlan"
        generatedWeekKey = weekKey
        generatedPlanID = planID
        generatedDayID = dayID
        generatedSlotID = slotID
    }
}

struct ActiveStudySession: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var sessionID: UUID
    var domainRawValue: String
    var chapterID: String?
    var startedAt: Date
    var accumulatedActiveSeconds: TimeInterval = 0
    var runningSince: Date?

    var domain: StudyDomainKind { StudyDomainKind(rawValue: domainRawValue) ?? .maths }
    var isPaused: Bool { runningSince == nil }

    func activeSeconds(at date: Date) -> TimeInterval {
        accumulatedActiveSeconds + (runningSince.map { max(0, date.timeIntervalSince($0)) } ?? 0)
    }
}

struct StudyExecution: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var sessionID: UUID
    var domainRawValue: String
    var chapterID: String?
    var startedAt: Date
    var endedAt: Date
    var activeSeconds: Int
    var note: String?

    var domain: StudyDomainKind { StudyDomainKind(rawValue: domainRawValue) ?? .maths }
    var activeMinutes: Int { max(0, activeSeconds / 60) }
}
