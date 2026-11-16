import { afterEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce";

describe("debounce", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the function after the specified delay", () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const debounced = debounce(callback, 300);

    debounced();

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(callback).toHaveBeenCalledOnce();
  });

  it("resets the timer when called again", () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const debounced = debounce(callback, 300);

    debounced();

    vi.advanceTimersByTime(200);

    debounced();

    vi.advanceTimersByTime(299);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(callback).toHaveBeenCalledOnce();
  });
});
