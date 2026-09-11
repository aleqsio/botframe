import { afterEach, describe, expect, it, vi } from "vitest";
import { acceleratorText } from "./acceleratorText";

const APPLE_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
const OTHER_AGENT = "Mozilla/5.0 (X11; Linux x86_64)";

function withAgent(userAgent: string): void {
	vi.stubGlobal("navigator", { userAgent });
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("acceleratorText", () => {
	it("writes the symbols of the keyboard of Apple", () => {
		withAgent(APPLE_AGENT);

		expect(acceleratorText("CmdOrCtrl+X")).toBe("⌘X");
		expect(acceleratorText("Cmd+Shift+Z")).toBe("⌘⇧Z");
	});

	it("writes the name of each key on a different platform", () => {
		withAgent(OTHER_AGENT);

		expect(acceleratorText("CmdOrCtrl+X")).toBe("Ctrl+X");
		expect(acceleratorText("Ctrl+Y")).toBe("Ctrl+Y");
	});

	it("writes nothing for a command that has no accelerator", () => {
		withAgent(APPLE_AGENT);
		expect(acceleratorText("")).toBe("");

		withAgent(OTHER_AGENT);
		expect(acceleratorText("")).toBe("");
	});
});
