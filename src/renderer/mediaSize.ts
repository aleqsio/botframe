import type { Asset } from "../document/assets";
import { assetKind } from "../document/assets";
import type { PendingMedia } from "./state/userState";

interface Size {
	width: number;
	height: number;
}

async function imageSize(blob: Blob): Promise<Size> {
	const bitmap = await createImageBitmap(blob);
	const size = { width: bitmap.width, height: bitmap.height };
	bitmap.close();
	return size;
}

function videoSize(blob: Blob): Promise<Size> {
	const url = URL.createObjectURL(blob);
	const video = document.createElement("video");
	return new Promise<Size>((resolve, reject) => {
		video.addEventListener("loadedmetadata", () => {
			resolve({ width: video.videoWidth, height: video.videoHeight });
		});
		video.addEventListener("error", reject);
		video.preload = "metadata";
		video.src = url;
	}).finally(() => {
		URL.revokeObjectURL(url);
	});
}

function isSize(size: Size): boolean {
	return size.width > 0 && size.height > 0;
}

export async function pendingMediaOf(asset: Asset | null): Promise<PendingMedia | null> {
	if (asset === null) {
		return null;
	}
	const blob = new Blob([asset.bytes], { type: asset.type });
	try {
		const size = await (assetKind(asset.type) === "video" ? videoSize(blob) : imageSize(blob));
		return isSize(size) ? { asset, ...size } : null;
	} catch {
		return null;
	}
}
