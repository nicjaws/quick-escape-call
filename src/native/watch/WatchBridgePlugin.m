#import <Capacitor/Capacitor.h>

CAP_PLUGIN(WatchBridgePlugin, "WatchBridge",
    CAP_PLUGIN_METHOD(notifyTrigger, CAPPluginReturnPromise);
)
