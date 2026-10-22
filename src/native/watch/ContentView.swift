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
    @Published private(set) var showConfirmation = false
    @Published private(set) var errorMessage: String?

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
            Task { @MainActor [weak self] in self?.errorMessage = "Sin conexión / Not connected" }
        }
    }

    func sendTrigger() {
        guard !isSending, !showConfirmation else { return }
        errorMessage = nil
        guard WCSession.isSupported(), WCSession.default.activationState == .activated else {
            fail("Conectando / Connecting")
            return
        }
        guard WCSession.default.isReachable else {
            fail("Abre FakeCall en iPhone / Open FakeCall on iPhone")
            NSLog("[FakeCallWatch] iPhone is not reachable")
            return
        }
        isSending = true
        let message = ["action": "fakecall", "requestId": UUID().uuidString]
        WCSession.default.sendMessage(message, replyHandler: { [weak self] reply in
            let accepted = reply["accepted"] as? Bool ?? false
            Task { @MainActor in
                guard let self = self, self.isSending else { return }
                self.isSending = false
                guard accepted else {
                    self.fail("iPhone no disponible / iPhone not ready")
                    return
                }
                self.showConfirmation = true
                WKInterfaceDevice.current().play(.success)
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    self.showConfirmation = false
                }
            }
        }, errorHandler: { [weak self] error in
            NSLog("[FakeCallWatch] Send failed: %@", error.localizedDescription)
            Task { @MainActor in
                self?.fail("Sin conexión / Not connected")
            }
        })
        // The message is on its way; if no acknowledgement arrives, say so
        // without treating it as an error (simulator transfers can be slow).
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
            guard let self = self, self.isSending else { return }
            NSLog("[FakeCallWatch] No acknowledgement from iPhone")
            self.isSending = false
            self.errorMessage = "Enviada al iPhone / Sent to iPhone"
        }
    }

    private func fail(_ message: String) {
        isSending = false
        errorMessage = message
        WKInterfaceDevice.current().play(.failure)
    }
}

struct ContentView: View {
    @StateObject private var session = WatchSession.shared
    @State private var doubleTap = WatchDoubleTapDetector()

    var body: some View {
        VStack(spacing: 12) {
            Text("FakeCall").font(.headline)
            Button(action: handleTap) {
                ZStack {
                    if session.showConfirmation {
                        Text("👍").font(.system(size: 38))
                    } else if session.isSending {
                        ProgressView()
                    } else {
                        Image(systemName: "phone.fill").font(.system(size: 38))
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 90)
            }
            .tint(.red)
            .disabled(session.isSending || session.showConfirmation)
            .accessibilityLabel("Activar llamada / Trigger call")
            Text(session.errorMessage ?? "Toca 2 veces / Tap twice")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: 30)
        }
    }

    private func handleTap() {
        if doubleTap.registerTap() { session.sendTrigger() }
    }
}
