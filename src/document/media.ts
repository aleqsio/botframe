import { isAssetId } from "./assets";
import type { AssetId } from "./assets";
import { bagOf } from "./bag";

export type MediaFit = "cover" | "contain" | "stretch" | "tile";

const MEDIA_FITS: readonly MediaFit[] = ["cover", "contain", "stretch", "tile"];

export interface MediaFill {
	asset: AssetId;
	fit: MediaFit;
}

function isMediaFit(text: unknown): text is MediaFit {
	return MEDIA_FITS.some((fit) => fit === text);
}

export function mediaOf(value: unknown): MediaFill | null {
	const { asset, fit } = bagOf(value);
	if (typeof asset !== "string" || !isAssetId(asset)) {
		return null;
	}
	return { asset, fit: isMediaFit(fit) ? fit : "cover" };
}
