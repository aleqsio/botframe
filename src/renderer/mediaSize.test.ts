import { afterEach, describe, expect, it, vi } from "vitest";
import { assetOf } from "../document/assets";
import { pendingMediaOf } from "./mediaSize";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("pendingMediaOf", () => {
	it("gives the natural size of an image", async () => {
		vi.stubGlobal("createImageBitmap", () =>
			Promise.resolve({ width: 64, height: 48, close: () => null }),
		);
		const asset = await assetOf(new Uint8Array([1]), "image/png");

		expect(await pendingMediaOf(asset)).toMatchObject({ width: 64, height: 48 });
	});

	it("gives nothing for an image that does not decode or has no size", async () => {
		const asset = await assetOf(new Uint8Array([1]), "image/png");
		vi.stubGlobal("createImageBitmap", () => Promise.reject(new Error("bad")));
		expect(await pendingMediaOf(asset)).toBeNull();
		vi.stubGlobal("createImageBitmap", () =>
			Promise.resolve({ width: 0, height: 0, close: () => null }),
		);
		expect(await pendingMediaOf(asset)).toBeNull();
	});
});
