import { isAssetId } from "./assets";
import type { AssetId } from "./assets";
import { bagOf } from "./bag";

export type MediaFit = "cover" | "contain" | "stretch" | "tile";

const MEDIA_FITS: readonly MediaFit[] = ["cover", "contain", "stretch", "tile"];

export type MediaStack = "over" | "under";

export interface MediaFill {
	asset: AssetId;
	fit: MediaFit;
	stack: MediaStack;
}

function isMediaFit(text: unknown): text is MediaFit {
	return MEDIA_FITS.some((fit) => fit === text);
}

export function mediaOf(value: unknown): MediaFill | null {
	const { asset, fit, stack } = bagOf(value);
	if (typeof asset !== "string" || !isAssetId(asset)) {
		return null;
	}
	return {
		asset,
		fit: isMediaFit(fit) ? fit : "cover",
		stack: stack === "under" ? "under" : "over",
	};
}
