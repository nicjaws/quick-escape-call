# Architecture rules

- Keep the iPhone and companion Watch bundle identifiers aligned across Capacitor and both Xcode configurations; watchOS uses that relationship to install the companion.
- Register the app-local WatchBridge using `registerPluginInstance` in the storyboard's custom `AppBridgeViewController`; Capacitor's automatic discovery does not include local source plugins and `registerPluginType` is ignored when auto-registration is enabled.
- Declare WatchBridge metadata once in Swift using `CAPBridgedPlugin`; the legacy Objective-C file is an inert compatibility source for existing Xcode target membership.
- Use a retained Capacitor listener for Watch requests and acknowledge after React accepts activation; startup must not lose events or show a false success on the Watch.
- Send discrete Watch activations with `WCSession.sendMessage` and a reply/error handler, not cached application context; an unavailable connection must not create a surprise call later.
- Keep the deliverable native sources under `src/native/watch` identical to their corresponding Xcode sources; the Xcode targets compile the copies under `ios/App`.
- Keep WatchConnectivity diagnostics local and log no user data; validate native builds and device connectivity on a Mac, not through browser simulation.