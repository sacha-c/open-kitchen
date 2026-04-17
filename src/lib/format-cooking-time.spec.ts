import { describe, expect, it } from "vitest";
import { formatCookingTime } from "./format-cooking-time";

describe("formatCookingTime", () => {
	it("returns '0s' for 0 seconds", () => {
		expect(formatCookingTime(0)).toBe("0s");
	});

	it("returns '0s' for negative values", () => {
		expect(formatCookingTime(-10)).toBe("0s");
	});

	it("formats seconds only", () => {
		expect(formatCookingTime(30)).toBe("30s");
	});

	it("formats exact minutes", () => {
		expect(formatCookingTime(60)).toBe("1m");
	});

	it("formats minutes and seconds", () => {
		expect(formatCookingTime(90)).toBe("1m 30s");
	});

	it("formats exact hours", () => {
		expect(formatCookingTime(3600)).toBe("1h");
	});

	it("formats hours and minutes", () => {
		expect(formatCookingTime(3660)).toBe("1h 1m");
	});

	it("formats hours, minutes, and drops seconds", () => {
		expect(formatCookingTime(3661)).toBe("1h 1m");
	});

	it("formats multiple hours", () => {
		expect(formatCookingTime(7200)).toBe("2h");
	});

	it("formats 45 minutes", () => {
		expect(formatCookingTime(2700)).toBe("45m");
	});
});
