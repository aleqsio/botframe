import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_MEDIA_BYTES } from "../shared/media";

const electron = vi.hoisted(() => ({
	handlers: new Map<string, (event: unknown, ...args: unknown[]) => unknown>(),
	fetch: vi.fn<(url: string) => Promise<Response>>(),
}));

vi.mock("electron", () => ({
	ipcMain: {
		handle: (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => {
			electron.handlers.set(channel, handler);
		},
	},
	net: { fetch: electron.fetch },
}));

const { connectMedia } = await import("./media");

function fetchMedia(url: string): unknown {
	connectMedia();
	return electron.handlers.get("media:fetch")?.(null, url);
}

function streamOf(chunks: readonly Uint8Array[]): ReadableStream<Uint8Array> {
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(chunk);
			}
			controller.close();
		},
	});
}

describe("fetchMedia", () => {
	beforeEach(() => {
		electron.fetch.mockReset();
	});

	it("gives the bytes and the media type of an image", async () => {
		electron.fetch.mockResolvedValue(
			new Response(streamOf([Uint8Array.of(1, 2), Uint8Array.of(3)]), {
				headers: { "content-type": "image/PNG; charset=binary" },
			}),
		);

		expect(await fetchMedia("https://example.com/a.png")).toEqual({
			type: "image/png",
			bytes: Uint8Array.of(1, 2, 3),
		});
	});

	it("does not fetch a URL that is not on the web", async () => {
		expect(await fetchMedia("file:///etc/passwd")).toBeNull();
		expect(electron.fetch).not.toHaveBeenCalled();
	});

	it("refuses a page before it reads the body", async () => {
		const pulls: number[] = [];
		const body = new ReadableStream<Uint8Array>(
			{
				pull: () => {
					pulls.push(1);
				},
			},
			{ highWaterMark: 0 },
		);
		electron.fetch.mockResolvedValue(
			new Response(body, { headers: { "content-type": "text/html" } }),
		);

		expect(await fetchMedia("https://example.com")).toBeNull();
		expect(pulls).toEqual([]);
	});

	it("stops a body without a length when it grows past the limit", async () => {
		const chunk = new Uint8Array(MAX_MEDIA_BYTES / 2 + 1);
		electron.fetch.mockResolvedValue(
			new Response(streamOf([chunk, chunk]), { headers: { "content-type": "video/mp4" } }),
		);

		expect(await fetchMedia("https://example.com/a.mp4")).toBeNull();
	});

	it("gives nothing when the fetch fails", async () => {
		electron.fetch.mockRejectedValue(new Error("offline"));

		expect(await fetchMedia("https://example.com/a.png")).toBeNull();
	});
});
