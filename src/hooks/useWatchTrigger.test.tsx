import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWatchTrigger } from "./useWatchTrigger";
import type { WatchTriggerEvent } from "@/lib/watchBridge";

const bridge = vi.hoisted(() => ({
  getPlatform: vi.fn(() => "ios"),
  addListener: vi.fn(),
  acknowledgeTrigger: vi.fn(() => Promise.resolve()),
  getPendingNotificationTrigger: vi.fn<() => Promise<{ trigger?: WatchTriggerEvent }>>(() => Promise.resolve({})),
  remove: vi.fn(() => Promise.resolve()),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: bridge.getPlatform } }));
vi.mock("@/lib/watchBridge", () => ({ WatchBridge: bridge }));

let receive: (event: WatchTriggerEvent) => void;
let resume: () => void;
const request = (requestId = "watch-request"): WatchTriggerEvent => ({
  requestId,
  expiresAt: Date.now() + 8000,
});

beforeEach(() => {
  vi.clearAllMocks();
  bridge.getPlatform.mockReturnValue("ios");
  bridge.getPendingNotificationTrigger.mockResolvedValue({});
  bridge.addListener.mockImplementation((name, callback) => {
    if (name === "trigger") receive = callback;
    else resume = callback;
    return Promise.resolve({ remove: bridge.remove });
  });
});
afterEach(() => vi.restoreAllMocks());

describe("useWatchTrigger", () => {
  it("accepts a real native event and acknowledges the accepted call", async () => {
    const onTrigger = vi.fn(() => true);
    const { unmount } = renderHook(() => useWatchTrigger(onTrigger));
    await waitFor(() => expect(bridge.getPendingNotificationTrigger).toHaveBeenCalledTimes(1));
    act(() => receive(request()));
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(bridge.acknowledgeTrigger).toHaveBeenCalledWith({ requestId: "watch-request", accepted: true });
    unmount();
    expect(bridge.remove).toHaveBeenCalledTimes(2);
  });

  it("does not falsely confirm a request rejected while the iPhone is busy", () => {
    const onTrigger = vi.fn(() => false);
    renderHook(() => useWatchTrigger(onTrigger));
    act(() => receive(request()));
    expect(bridge.acknowledgeTrigger).toHaveBeenCalledWith({ requestId: "watch-request", accepted: false });
  });

  it("does not restart a call when the same request is delivered twice", () => {
    const onTrigger = vi.fn(() => true);
    renderHook(() => useWatchTrigger(onTrigger));
    const event = request();
    act(() => { receive(event); receive(event); });
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(bridge.acknowledgeTrigger).toHaveBeenCalledTimes(2);
  });

  it("uses the current callback without removing and reinstalling the listener", () => {
    const first = vi.fn(() => true);
    const latest = vi.fn(() => true);
    const { rerender } = renderHook(({ callback }) => useWatchTrigger(callback), { initialProps: { callback: first } });
    rerender({ callback: latest });
    act(() => receive(request()));
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
    expect(bridge.addListener).toHaveBeenCalledTimes(2);
  });

  it("ignores expired startup events without triggering a surprise call", () => {
    const onTrigger = vi.fn(() => true);
    renderHook(() => useWatchTrigger(onTrigger));
    act(() => receive({ requestId: "expired", expiresAt: Date.now() - 1 }));
    expect(onTrigger).not.toHaveBeenCalled();
    // No acknowledgement: the native fallback notification must stay scheduled.
    expect(bridge.acknowledgeTrigger).not.toHaveBeenCalled();
  });

  it("passes the immediate flag from a notification tap to the callback", () => {
    const onTrigger = vi.fn(() => true);
    renderHook(() => useWatchTrigger(onTrigger));
    act(() => receive({ requestId: "tap", expiresAt: Date.now() + 8000, immediate: true }));
    expect(onTrigger).toHaveBeenCalledWith(true);
    expect(bridge.acknowledgeTrigger).toHaveBeenCalledWith({ requestId: "tap", accepted: true });
  });

  it("waits for a cold-launch notification handoff before marking the presentation ready", async () => {
    let resolvePending: ((value: { trigger?: WatchTriggerEvent }) => void) | undefined;
    bridge.getPendingNotificationTrigger.mockImplementationOnce(() => new Promise((resolve) => { resolvePending = resolve; }));
    const onTrigger = vi.fn(() => true);
    const { result } = renderHook(() => useWatchTrigger(onTrigger));
    await waitFor(() => expect(resolvePending).toBeDefined());
    expect(result.current.presentationReady).toBe(false);
    await act(async () => resolvePending?.({ trigger: { ...request("cold-launch"), immediate: true } }));
    expect(onTrigger).toHaveBeenCalledWith(true);
    expect(result.current.presentationReady).toBe(true);
    expect(result.current.notificationRequestId).toBe("cold-launch");
  });

  it("checks a notification again on warm resume without replaying it twice", async () => {
    const onTrigger = vi.fn(() => true);
    const { result } = renderHook(() => useWatchTrigger(onTrigger));
    await waitFor(() => expect(result.current.presentationReady).toBe(true));
    const trigger = { ...request("resumed"), immediate: true };
    bridge.getPendingNotificationTrigger.mockResolvedValue({ trigger });
    await act(async () => { receive(trigger); resume(); });
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(onTrigger).toHaveBeenCalledWith(true);
    expect(result.current.notificationRequestId).toBe("resumed");
  });

  it("upgrades a delayed Watch activation when its notification is tapped", () => {
    const onTrigger = vi.fn(() => true);
    renderHook(() => useWatchTrigger(onTrigger));
    act(() => {
      receive(request("same-call"));
      receive({ ...request("same-call"), immediate: true });
    });
    expect(onTrigger.mock.calls).toEqual([[false], [true]]);
  });

  it("keeps browser simulation independent from the native plugin", () => {
    bridge.getPlatform.mockReturnValue("web");
    const onTrigger = vi.fn();
    const { unmount } = renderHook(() => useWatchTrigger(onTrigger));
    act(() => window.dispatchEvent(new CustomEvent("fakecall:trigger")));
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(bridge.addListener).not.toHaveBeenCalled();
    unmount();
    act(() => window.dispatchEvent(new CustomEvent("fakecall:trigger")));
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });
});