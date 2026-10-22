import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Index from "./Index";
import type { WatchTriggerEvent } from "@/lib/watchBridge";

const native = vi.hoisted(() => ({
  addListener: vi.fn(),
  acknowledgeTrigger: vi.fn(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve()),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "ios" } }));
vi.mock("@/lib/watchBridge", () => ({ WatchBridge: native }));
vi.mock("@/components/IncomingCallScreen", () => ({
  default: ({ callerName }: { callerName: string }) => <div role="alert">{callerName}</div>,
}));

let receive: (event: WatchTriggerEvent) => void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  localStorage.clear();
  native.addListener.mockImplementation((_name, callback) => {
    receive = callback;
    return Promise.resolve({ remove: native.remove });
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