import SwiftUI

enum AppTheme {
    static let windowBackground = Color(nsColor: .windowBackgroundColor)
    static let sportColor = Color.red
    static let bikeColor = Color(red: 125 / 255, green: 211 / 255, blue: 252 / 255)
    static let minimumHitTarget: CGFloat = 44
    static let comfortableRowHeight: CGFloat = 50

    static func color(for domain: StudyDomainKind) -> Color {
        switch domain {
        case .maths: .indigo
        case .proba: .orange
        case .info: .teal
        }
    }

    static func sessionForeground(for domain: StudyDomainKind) -> Color {
        switch domain {
        case .maths: .white
        case .proba, .info: .black.opacity(0.82)
        }
    }

    static func color(for session: StudySession) -> Color {
        switch session.kind {
        case .course: color(for: session.domain)
        case .sport: sportColor
        case .bike: bikeColor
        }
    }

    static func sessionForeground(for session: StudySession) -> Color {
        switch session.kind {
        case .course: sessionForeground(for: session.domain)
        case .sport: .white
        case .bike: .black.opacity(0.82)
        }
    }

    static func color(for activityKind: SessionKind) -> Color {
        switch activityKind {
        case .course: .accentColor
        case .sport: sportColor
        case .bike: bikeColor
        }
    }
}

extension View {
    func comfortableHitTarget(minHeight: CGFloat = AppTheme.minimumHitTarget) -> some View {
        frame(minHeight: minHeight)
            .contentShape(Rectangle())
    }

    func fullWidthHitTarget(
        minHeight: CGFloat = AppTheme.comfortableRowHeight,
        alignment: Alignment = .leading
    ) -> some View {
        frame(maxWidth: .infinity, minHeight: minHeight, alignment: alignment)
            .contentShape(Rectangle())
    }
}

struct DomainBadge: View {
    let domain: StudyDomainKind

    var body: some View {
        Label {
            Text(domain.title)
        } icon: {
            Circle()
                .fill(AppTheme.color(for: domain))
                .frame(width: 8, height: 8)
                .accessibilityHidden(true)
        }
            .font(.callout.weight(.semibold))
            .foregroundStyle(.primary)
            .padding(.horizontal, 11)
            .padding(.vertical, 7)
            .background(Color(nsColor: .controlBackgroundColor), in: Capsule())
            .overlay {
                Capsule().stroke(AppTheme.color(for: domain).opacity(0.65), lineWidth: 1)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Domaine \(domain.title)")
    }
}

struct SessionBadge: View {
    let session: StudySession

    var body: some View {
        if session.kind != .course {
            Label(session.kind.title, systemImage: session.kind.systemImage)
                .font(.callout.weight(.semibold))
                .foregroundStyle(AppTheme.color(for: session))
                .padding(.horizontal, 11)
                .padding(.vertical, 7)
                .background(Color(nsColor: .controlBackgroundColor), in: Capsule())
                .overlay { Capsule().stroke(AppTheme.color(for: session), lineWidth: 1.5) }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Séance de \(session.kind.title.lowercased())")
        } else {
            DomainBadge(domain: session.domain)
        }
    }
}
