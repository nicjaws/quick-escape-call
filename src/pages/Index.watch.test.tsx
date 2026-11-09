import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Index from "./Index";
import type { WatchTriggerEvent } from "@/lib/watchBridge";

const native = vi.hoisted(() => ({
  getPlatform: vi.fn(() => "ios"),
  addListener: vi.fn(),
  acknowledgeTrigger: vi.fn(() => Promise.resolve()),
  syncSettings: vi.fn(() => Promise.resolve()),
  requestNotificationPermission: vi.fn(() => Promise.resolve({ granted: true })),
  getPendingNotificationTrigger: vi.fn<() => Promise<{ trigger?: WatchTriggerEvent }>>(() => Promise.resolve({})),
  completePresentation: vi.fn<(_options: { requestId?: string }) => Promise<void>>(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve()),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: native.getPlatform } }));
vi.mock("@/lib/watchBridge", () => ({ WatchBridge: native }));
vi.mock("@/components/IncomingCallScreen", () => ({
  default: ({ callerName }: { callerName: string }) => <div role="alert">{callerName}</div>,
}));

let receive: (event: WatchTriggerEvent) => void;
let resume: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  native.getPlatform.mockReturnValue("ios");
  native.getPendingNotificationTrigger.mockResolvedValue({});
  localStorage.clear();
  native.addListener.mockImplementation((name, callback) => {
    if (name === "trigger") receive = callback;
    else resume = callback;
    return Promise.resolve({ remove: native.remove });
  });
});

describe("Two taps on iPhone without a Watch", () => {
  it("does not activate after only one tap", async () => {
    native.getPlatform.mockReturnValue("web");
    render(<Index />);
    fireEvent.click(screen.getByRole("button", { name: "Activar llamada falsa" }));
    await act(async () => { vi.advanceTimersByTime(10000); });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Activar llamada falsa" })).toBeDefined();
  });

  it("activates locally with two taps within 0.8 seconds and rings after 10 seconds", async () => {
    native.getPlatform.mockReturnValue("web");
    render(<Index />);
    const button = screen.getByRole("button", { name: "Activar llamada falsa" });
    fireEvent.click(button);
    await act(async () => { vi.advanceTimersByTime(790); });
    fireEvent.click(button);
    expect(native.addListener).not.toHaveBeenCalled();
    expect(native.acknowledgeTrigger).not.toHaveBeenCalled();
    for (let second = 0; second < 9; second += 1) {
      await act(async () => { vi.advanceTimersByTime(1000); });
    }
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole("alert").textContent).toBe("Trabajo");
  });

  it("does not activate if the two taps are 0.8 seconds apart", async () => {
    native.getPlatform.mockReturnValue("web");
    render(<Index />);
    const button = screen.getByRole("button", { name: "Activar llamada falsa" });
    fireEvent.click(button);
    await act(async () => { vi.advanceTimersByTime(800); });
    fireEvent.click(button);
    await act(async () => { vi.advanceTimersByTime(10000); });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Activar llamada falsa" })).toBeDefined();
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Watch activation on iPhone", () => {
  it("shows the incoming call after the default 10-second delay", async () => {
    render(<Index />);
    act(() => receive({ requestId: "from-watch", expiresAt: Date.now() + 8000 }));
    expect(native.acknowledgeTrigger).toHaveBeenCalledWith({ requestId: "from-watch", accepted: true });
    for (let second = 0; second < 9; second += 1) {
      await act(async () => { vi.advanceTimersByTime(1000); });
    }
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole("alert").textContent).toBe("Trabajo");
  });

  it("does not restart the delay when another Watch activation arrives while busy", async () => {
    render(<Index />);
    act(() => receive({ requestId: "first", expiresAt: Date.now() + 8000 }));
    for (let second = 0; second < 3; second += 1) {
      await act(async () => { vi.advanceTimersByTime(1000); });
    }
    act(() => receive({ requestId: "second", expiresAt: Date.now() + 8000 }));
    expect(native.acknowledgeTrigger).toHaveBeenCalledWith({ requestId: "second", accepted: false });
    for (let second = 0; second < 7; second += 1) {
      await act(async () => { vi.advanceTimersByTime(1000); });
    }
    expect(screen.getByRole("alert").textContent).toBe("Trabajo");
  });

  it("rings immediately on cold launch from a notification and completes only its matching presentation", async () => {
    native.getPendingNotificationTrigger.mockResolvedValue({ trigger: {
      requestId: "cold-call", expiresAt: Date.now() + 8000, immediate: true,
    } });
    render(<Index />);
    expect(native.completePresentation).not.toHaveBeenCalled();
    await act(async () => {});
    expect(screen.getByRole("alert").textContent).toBe("Trabajo");
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(native.completePresentation).toHaveBeenCalledWith({ requestId: "cold-call" });
    expect(native.completePresentation.mock.calls.every(([options]) => options.requestId === "cold-call")).toBe(true);
  });

  it("rings immediately when a notification resumes the app", async () => {
    render(<Index />);
    await act(async () => {});
    native.getPendingNotificationTrigger.mockResolvedValue({ trigger: {
      requestId: "warm-call", expiresAt: Date.now() + 8000, immediate: true,
    } });
    await act(async () => { resume(); });
    expect(screen.getByRole("alert").textContent).toBe("Trabajo");
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(native.completePresentation).toHaveBeenCalledWith({ requestId: "warm-call" });
  });

  it("skips a remaining countdown when the same call's notification is tapped", async () => {
    render(<Index />);
    await act(async () => {});
    act(() => receive({ requestId: "upgrade", expiresAt: Date.now() + 8000 }));
    act(() => receive({ requestId: "upgrade", expiresAt: Date.now() + 8000, immediate: true }));
    expect(screen.getByRole("alert").textContent).toBe("Trabajo");
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(native.completePresentation).toHaveBeenCalledWith({ requestId: "upgrade" });
  });
});