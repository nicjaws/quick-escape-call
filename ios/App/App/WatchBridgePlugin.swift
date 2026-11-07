import Foundation
import Capacitor
import WatchConnectivity
import UserNotifications

@objc(WatchBridgePlugin)
public class WatchBridgePlugin: CAPPlugin, CAPBridgedPlugin, WCSessionDelegate, UNUserNotificationCenterDelegate {
    public let identifier = "WatchBridgePlugin"
    public let jsName = "WatchBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "notifyTrigger", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledgeTrigger", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestNotificationPermission", returnType: CAPPluginReturnPromise)
    ]

    // Accessed only on the main queue, like Capacitor's event listener storage.
    private var pendingReplies: [String: ([String: Any]) -> Void] = [:]
    private var pendingRequests = Set<String>()
    private let notificationPrefix = "fakecall-"

    public override func load() {
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
        UNUserNotificationCenter.current().delegate = self
        NSLog("[WatchBridge] Receiver registered")
    }

    @objc func notifyTrigger(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.receive(["action": "fakecall", "requestId": UUID().uuidString])
            call.resolve()
        }
    }

    /// The web app mirrors its settings here so a background wake can schedule
    /// the fallback notification with the right name and delay.
    @objc func syncSettings(_ call: CAPPluginCall) {
        let defaults = UserDefaults.standard
        if let name = call.getString("callerName") {
            defaults.set(name, forKey: "watchBridge.callerName")
        }
        if let delay = call.getInt("delaySeconds") {
            defaults.set(delay, forKey: "watchBridge.delaySeconds")
        }
        call.resolve()
    }

    @objc func requestNotificationPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, error in
            if let error = error {
                NSLog("[WatchBridge] Notification permission error: %@", error.localizedDescription)
            }
            call.resolve(["granted": granted])
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
            // The web app handles the call itself: cancel the fallback notification.
            UNUserNotificationCenter.current()
                .removePendingNotificationRequests(withIdentifiers: [self.notificationPrefix + requestId])
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

        // Fallback for a closed or suspended app: a local notification fires
        // after the configured delay, even on the lock screen. If the web app
        // acknowledges (it is in the foreground), it cancels this notification.
        scheduleFallbackNotification(requestId: requestId)
        // Confirm to the Watch right away: the call happens one way or another.
        if let replyHandler = pendingReplies.removeValue(forKey: requestId) {
            replyHandler(["accepted": true])
        }

        // Keep startup messages until React installs its listener.
        let expiresAt = Date().addingTimeInterval(8).timeIntervalSince1970 * 1000
        notifyListeners("trigger", data: ["requestId": requestId, "expiresAt": expiresAt], retainUntilConsumed: true)
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) {
            guard self.pendingRequests.remove(requestId) != nil else { return }
            self.pendingReplies.removeValue(forKey: requestId)
            NSLog("[WatchBridge] iPhone interface did not acknowledge the trigger")
        }
    }

    private func scheduleFallbackNotification(requestId: String) {
        let defaults = UserDefaults.standard
        let callerName = defaults.string(forKey: "watchBridge.callerName") ?? "Trabajo"
        let storedDelay = defaults.object(forKey: "watchBridge.delaySeconds") as? Int
        let delay = max(storedDelay ?? 10, 1)
        let content = UNMutableNotificationContent()
        content.title = callerName
        content.body = "móvil / mobile"
        content.sound = UNNotificationSound(named: UNNotificationSoundName("ringtone.caf"))
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(delay), repeats: false)
        let request = UNNotificationRequest(identifier: notificationPrefix + requestId,
                                            content: content,
                                            trigger: trigger)
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                NSLog("[WatchBridge] Notification scheduling failed: %@", error.localizedDescription)
            }
        }
    }

    /// Tapping the fallback notification opens the app straight into the call.
    public func userNotificationCenter(_ center: UNUserNotificationCenter,
                                       didReceive response: UNNotificationResponse,
                                       withCompletionHandler completionHandler: @escaping () -> Void) {
        let identifier = response.notification.request.identifier
        let requestId = identifier.hasPrefix(notificationPrefix)
            ? String(identifier.dropFirst(notificationPrefix.count))
            : identifier
        DispatchQueue.main.async {
            let expiresAt = Date().addingTimeInterval(8).timeIntervalSince1970 * 1000
            self.notifyListeners("trigger",
                                 data: ["requestId": requestId, "expiresAt": expiresAt, "immediate": true],
                                 retainUntilConsumed: true)
            completionHandler()
        }
    }

    public func userNotificationCenter(_ center: UNUserNotificationCenter,
                                       willPresent notification: UNNotification,
                                       withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
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
