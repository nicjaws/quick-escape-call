import Foundation
import Capacitor
import WatchConnectivity

@objc(WatchBridgePlugin)
public class WatchBridgePlugin: CAPPlugin, CAPBridgedPlugin, WCSessionDelegate {
    public let identifier = "WatchBridgePlugin"
    public let jsName = "WatchBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "notifyTrigger", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledgeTrigger", returnType: CAPPluginReturnPromise)
    ]

    // Accessed only on the main queue, like Capacitor's event listener storage.
    private var pendingReplies: [String: ([String: Any]) -> Void] = [:]
    private var pendingRequests = Set<String>()

    public override func load() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
        NSLog("[WatchBridge] Receiver registered")
    }

    @objc func notifyTrigger(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.receive(["action": "fakecall", "requestId": UUID().uuidString])
            call.resolve()
        }
    }

    @objc func acknowledgeTrigger(_ call: CAPPluginCall) {
        guard let requestId = call.getString("requestId") else {
            call.reject("Missing requestId")
            return
        }
        let accepted = call.getBool("accepted") ?? false
        DispatchQueue.main.async {
            // A timed-out request must not be confirmed afterwards.
            guard self.pendingRequests.remove(requestId) != nil else {
                call.resolve()
                return
            }
            self.pendingReplies.removeValue(forKey: requestId)?(["accepted": accepted])
            NSLog("[WatchBridge] iPhone activation accepted: %@", accepted.description)
            call.resolve()
        }
    }

    private func receive(_ message: [String: Any],
                         replyHandler: (([String: Any]) -> Void)? = nil) {
        guard message["action"] as? String == "fakecall" else {
            replyHandler?(["accepted": false])
            return
        }
        let requestId = message["requestId"] as? String ?? UUID().uuidString
        pendingRequests.insert(requestId)
        if let replyHandler = replyHandler { pendingReplies[requestId] = replyHandler }
        NSLog("[WatchBridge] Trigger received")
        // Keep startup messages until React installs its listener.
        let expiresAt = Date().addingTimeInterval(8).timeIntervalSince1970 * 1000
        notifyListeners("trigger", data: ["requestId": requestId, "expiresAt": expiresAt], retainUntilConsumed: true)
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) {
            guard self.pendingRequests.remove(requestId) != nil else { return }
            self.pendingReplies.removeValue(forKey: requestId)?(["accepted": false])
            NSLog("[WatchBridge] iPhone interface did not acknowledge the trigger")
        }
    }

    public func session(_ session: WCSession,
                        didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { self.receive(message) }
    }

    public func session(_ session: WCSession,
                        didReceiveMessage message: [String: Any],
                        replyHandler: @escaping ([String: Any]) -> Void) {
        DispatchQueue.main.async { self.receive(message, replyHandler: replyHandler) }
    }

    public func session(_ session: WCSession,
                        activationDidCompleteWith activationState: WCSessionActivationState,
                        error: Error?) {
        if let error = error {
            NSLog("[WatchBridge] Activation failed: %@", error.localizedDescription)
        } else {
            NSLog("[WatchBridge] Session activated: %ld, paired: %d, Watch app installed: %d",
                  activationState.rawValue, session.isPaired, session.isWatchAppInstalled)
        }
    }

    public func sessionDidBecomeInactive(_ session: WCSession) {}
    public func sessionDidDeactivate(_ session: WCSession) { session.activate() }
}
