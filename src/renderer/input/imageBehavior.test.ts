import { describe, expect, it } from "vitest";
import { assetOf } from "../../document/assets";
import type { Asset } from "../../document/assets";
import { DEFAULT_PLAYBACK } from "../../document/media";
import type { PendingMedia } from "../state/userState";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { dragOver, lastDrawn, tapAt, targetOf } from "./toolFixtures";

async function picture(type = "image/png"): Promise<Asset> {
	const asset = await assetOf(new Uint8Array([1, 2, 3]), type);
	if (asset === null) {
		throw new Error("the asset is not valid");
	}
	return asset;
}

async function readyTarget(type?: string): Promise<{ target: PointerTarget; media: PendingMedia }> {
	const target = targetOf(false);
	const media = { asset: await picture(type), width: 300, height: 200 };
	target.user.tool.set("image");
	target.user.pendingMedia.set(media);
	return { target, media };
}

describe("the image tool", () => {
	it("does nothing on the canvas before the media loads", () => {
		const target = targetOf(false);
		target.user.tool.set("image");

		tapAt(behaviorFor("image"), target, { x: 50, y: 50 });

		expect(target.doc.layerIds()).toHaveLength(1);
	});

	it("puts the media at its natural size, centered on a tap, in one undo step", async () => {
		const { target, media } = await readyTarget();
		const changes = target.doc.changeCount();

		tapAt(behaviorFor("image"), target, { x: 500, y: 400 });

		expect(lastDrawn(target)).toMatchObject({
			x: 350,
			y: 300,
			width: 300,
			height: 200,
			name: "Image 1",
			media: { asset: media.asset.id, fit: "cover", stack: "over", ...DEFAULT_PLAYBACK },
		});
		expect(target.doc.assets.get(media.asset.id)).not.toBeNull();
		expect(target.doc.changeCount()).toBe(changes + 1);
		expect(target.user.tool.get()).toBe("select");
		expect(target.user.pendingMedia.get()).toBeNull();
	});

	it("draws a video layer to the dragged size", async () => {
		const { target, media } = await readyTarget("video/mp4");

		dragOver(behaviorFor("image"), target, {
			press: { x: 40, y: 40 },
			release: { x: 240, y: 140 },
		});

		expect(lastDrawn(target)).toMatchObject({
			x: 40,
			y: 40,
			width: 200,
			height: 100,
			name: "Video 1",
			media: { asset: media.asset.id },
		});
		expect(target.user.draw.get()).toBeNull();
	});
});
