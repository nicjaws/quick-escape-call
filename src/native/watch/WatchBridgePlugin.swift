import Foundation
import Capacitor
import WatchConnectivity
import UserNotifications
import AVFoundation

@objc(WatchBridgePlugin)
public class WatchBridgePlugin: CAPPlugin, CAPBridgedPlugin, WCSessionDelegate, UNUserNotificationCenterDelegate {
    public let identifier = "WatchBridgePlugin"
    public let jsName = "WatchBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "notifyTrigger", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledgeTrigger", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestNotificationPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "installRingtone", returnType: CAPPluginReturnPromise)
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
        if let custom = call.getBool("useCustomRingtone") {
            defaults.set(custom, forKey: "watchBridge.useCustomRingtone")
        }
        call.resolve()
    }

    /// Public iOS notification API: user-owned PCM WAV stored locally in
    /// Library/Sounds, never read from private system ringtone directories.
    @objc func installRingtone(_ call: CAPPluginCall) {
        guard let base64 = call.getString("base64"),
              base64.utf8.count <= 2_400_000,
              let data = Data(base64Encoded: base64),
              data.count > 44, data.count <= 1_764_044 else {
            call.reject("Audio no válido / Invalid audio")
            return
        }
        DispatchQueue.global(qos: .utility).async {
            let temporary = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString + ".wav")
            defer { try? FileManager.default.removeItem(at: temporary) }
            do {
                try data.write(to: temporary, options: .atomic)
                let audio = try AVAudioFile(forReading: temporary)
                let format = audio.fileFormat
                let duration = Double(audio.length) / format.sampleRate
                guard duration > 0, duration <= 20,
                      format.sampleRate == 44100, format.channelCount == 1,
                      (format.settings[AVFormatIDKey] as? UInt32) == kAudioFormatLinearPCM else {
                    call.reject("Audio no compatible / Unsupported audio")
                    return
                }
                let library = try FileManager.default.url(for: .libraryDirectory,
                                                         in: .userDomainMask,
                                                         appropriateFor: nil, create: true)
                let directory = library.appendingPathComponent("Sounds", isDirectory: true)
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                try data.write(to: directory.appendingPathComponent("personal-ringtone.wav"), options: .atomic)
                call.resolve()
            } catch {
                call.reject("No se pudo guardar el tono / Could not save ringtone")
            }
        }
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
        let custom = defaults.bool(forKey: "watchBridge.useCustomRingtone")
        let soundName = custom ? "personal-ringtone.wav" : "ringtone.caf"
        content.sound = UNNotificationSound(named: UNNotificationSoundName(soundName))
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
