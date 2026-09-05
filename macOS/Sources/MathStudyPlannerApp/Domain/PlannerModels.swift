import Foundation

enum MasteryLevel: Int, Codable, CaseIterable, Identifiable {
    case notEvaluated = 0
    case read = 1
    case understood = 2
    case practised = 3
    case mastered = 4

    var id: Int { rawValue }

    var title: String {
        switch self {
        case .notEvaluated: "Non évalué"
        case .read: "Lu"
        case .understood: "Compris"
        case .practised: "Exercices"
        case .mastered: "Maîtrisé"
        }
    }
}

enum ActivityKind: String, Codable {
    case chapterStatus
    case sessionWorked
    case sportWorked
    case review
}

struct StudyActivity: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var kind: ActivityKind
    var domainRawValue: String
    var chapterID: String?
    var sessionID: UUID?
    var occurredAt: Date
    var minutes: Int

    var domain: StudyDomainKind { StudyDomainKind(rawValue: domainRawValue) ?? .maths }
}

struct PlanningSlot: Identifiable, Codable, Hashable {
    var id: String
    var label: String
    var startMinutes: Int
    var endMinutes: Int
    /// Nil preserves the historical format, where every activity slot was Sport.
    var activityTypeRawValue: String? = nil

    var startLabel: String { Self.timeLabel(minutes: startMinutes) }
    var endLabel: String { Self.timeLabel(minutes: endMinutes) }

    var activityKind: SessionKind {
        get {
            guard let kind = activityTypeRawValue.flatMap(SessionKind.init(rawValue:)), kind != .course else {
                return .sport
            }
            return kind
        }
        set {
            activityTypeRawValue = newValue == .sport ? nil : newValue.rawValue
        }
    }

    static func minutes(from label: String) -> Int? {
        let parts = label.split(separator: ":").compactMap { Int($0) }
        guard parts.count == 2, (0...23).contains(parts[0]), (0...59).contains(parts[1]) else { return nil }
        return parts[0] * 60 + parts[1]
    }

    static func timeLabel(minutes: Int) -> String {
        String(format: "%02d:%02d", max(0, minutes) / 60, max(0, minutes) % 60)
    }
}

struct PlanningDay: Identifiable, Codable, Hashable {
    var id: String
    var label: String
    var longLabel: String
    var domainRawValue: String?
    var isEnabled: Bool
    var courseSlots: [PlanningSlot]
    var sportSlots: [PlanningSlot]

    var domain: StudyDomainKind? {
        get { domainRawValue.flatMap(StudyDomainKind.init(rawValue:)) }
        set { domainRawValue = newValue?.rawValue }
    }
}

struct WeekPlan: Identifiable, Codable, Hashable {
    var id: String
    var label: String
    var days: [PlanningDay]

    var kind: WeekKind { WeekKind(rawValue: id) ?? .a }
}
