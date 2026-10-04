import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebPage } from "./webPage";

function response(): ServerResponse {
	return new ServerResponse(new IncomingMessage(new Socket()));
}

afterEach(() => {
	vi.useRealTimers();
});

describe("WebPage", () => {
	it("refuses a call when no page polls", async () => {
		await expect(new WebPage().call("undo", {})).rejects.toThrow(/No botframe page/u);
	});

	it("drops a queued call that timed out, so that the next poll does not run it", async () => {
		vi.useFakeTimers();
		const page = new WebPage();
		const first = response();
		page.poll(first);
		first.emit("close");
		const failed = page.call("undo", {}).catch(String);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(await failed).toMatch(/did not answer/u);
		const next = response();
		page.poll(next);
		expect(next.writableEnded).toBe(false);
	});
});
