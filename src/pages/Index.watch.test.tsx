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
  remove: vi.fn(() => Promise.resolve()),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: native.getPlatform } }));
vi.mock("@/lib/watchBridge", () => ({ WatchBridge: native }));
vi.mock("@/components/IncomingCallScreen", () => ({
  default: ({ callerName }: { callerName: string }) => <div role="alert">{callerName}</div>,
}));

let receive: (event: WatchTriggerEvent) => void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  native.getPlatform.mockReturnValue("ios");
  localStorage.clear();
  native.addListener.mockImplementation((_name, callback) => {
    receive = callback;
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
});