import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { keepSession } from "./session";
import { readSession } from "./sessionStore";
import { Tab } from "./state/tab";
import { Workspace } from "./state/workspace";

vi.mock(import("./sessionStore"), () => ({
	readSession: vi.fn<typeof readSession>(() => Promise.resolve(null)),
	writeSession: vi.fn<() => Promise<void>>(() => Promise.resolve()),
}));

function namesOf(workspace: Workspace): readonly string[] {
	return workspace.tabs.get().map((tab) => tab.name.get());
}

beforeEach(() => {
	vi.stubGlobal("window", { addEventListener: vi.fn<() => void>(), alert: vi.fn<() => void>() });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("keepSession", () => {
	it("opens the welcome document when no session is stored", async () => {
		const workspace = new Workspace(Tab.untitled());
		await keepSession(workspace);
		expect(namesOf(workspace)).toEqual(["Welcome"]);
	});

	it("keeps the tabs that the user opens while the welcome document loads", async () => {
		const workspace = new Workspace(Tab.untitled());
		const kept = keepSession(workspace);
		workspace.add(Tab.untitled());
		await kept;
		expect(namesOf(workspace)).toEqual(["Untitled", "Untitled"]);
	});

	it("does not open the welcome document when a session is stored", async () => {
		vi.mocked(readSession).mockResolvedValueOnce({
			tabs: [{ name: "Poster", token: null, savedVersion: "", bytes: new Uint8Array() }],
			active: 0,
		});
		const workspace = new Workspace(Tab.untitled());
		await keepSession(workspace);
		expect(namesOf(workspace)).toEqual(["Untitled"]);
	});
});
