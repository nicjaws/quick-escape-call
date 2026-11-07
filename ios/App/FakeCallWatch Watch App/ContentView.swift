import SwiftUI
import Combine
import WatchConnectivity
import WatchKit

struct WatchDoubleTapDetector {
    private var lastTap: Date?

    mutating func registerTap(at now: Date = Date()) -> Bool {
        if let lastTap = lastTap, now.timeIntervalSince(lastTap) < 0.8 {
            self.lastTap = nil
            return true
        }
        lastTap = now
        return false
    }
}

@MainActor
class WatchSession: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchSession()
    @Published private(set) var isSending = false

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    nonisolated func session(_ session: WCSession,
                             activationDidCompleteWith state: WCSessionActivationState,
                             error: Error?) {
        if let error = error {
            NSLog("[FakeCallWatch] Activation failed: %@", error.localizedDescription)
        }
    }

    /// Stealth by design: the screen never changes after a trigger. The only
    /// feedback is a haptic tap on the wrist — nobody looking at the watch
    /// can tell anything happened.
    func sendTrigger() {
        guard !isSending else { return }
        guard WCSession.isSupported(), WCSession.default.activationState == .activated else {
            fail()
            return
        }
        guard WCSession.default.isReachable else {
            NSLog("[FakeCallWatch] iPhone is not reachable")
            fail()
            return
        }
        isSending = true
        WKInterfaceDevice.current().play(.click) // discreet "sent" tap
        let message = ["action": "fakecall", "requestId": UUID().uuidString]
        WCSession.default.sendMessage(message, replyHandler: { [weak self] reply in
            let accepted = reply["accepted"] as? Bool ?? false
            Task { @MainActor in
                guard let self = self, self.isSending else { return }
                self.isSending = false
                if accepted {
                    WKInterfaceDevice.current().play(.success)
                } else {
                    self.fail()
                }
            }
        }, errorHandler: { [weak self] error in
            NSLog("[FakeCallWatch] Send failed: %@", error.localizedDescription)
            Task { @MainActor in
                self?.fail()
            }
        })
        // If no acknowledgement arrives (simulator transfers can be slow),
        // stop tracking without any visible change.
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
            guard let self = self, self.isSending else { return }
            NSLog("[FakeCallWatch] No acknowledgement from iPhone")
            self.isSending = false
        }
    }

    private func fail() {
        isSending = false
        WKInterfaceDevice.current().play(.failure)
    }
}

struct ContentView: View {
    @StateObject private var session = WatchSession.shared
    @State private var doubleTap = WatchDoubleTapDetector()
    @State private var stealth = false

    var body: some View {
        if stealth {
            // Stealth: after the double tap the screen goes black, as if the
            // watch were asleep. Only a silent haptic confirms the trigger —
            // nobody looking at the watch can tell anything happened.
            // It stays black through the whole call; tap once to bring the
            // normal screen back.
            Color.black
                .ignoresSafeArea()
                .contentShape(Rectangle())
                .onTapGesture { stealth = false }
        } else {
            mainView
        }
    }

    private var mainView: some View {
        VStack(spacing: 12) {
            Text("FakeCall").font(.headline)
            Button(action: handleTap) {
                // Always the same look: no spinner, no checkmark, no messages.
                Image(systemName: "phone.fill")
                    .font(.system(size: 38))
                    .frame(maxWidth: .infinity, minHeight: 90)
            }
            .tint(.red)
            .accessibilityLabel("Activar llamada / Trigger call")
            Text("Toca 2 veces / Tap twice")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: 30)
        }
    }

    private func handleTap() {
        if doubleTap.registerTap() {
            session.sendTrigger()
            stealth = true
        }
    }
}
