import { isAssetId } from "./assets";
import type { AssetId } from "./assets";
import { bagOf } from "./bag";

export type MediaFit = "cover" | "contain" | "stretch" | "tile";

const MEDIA_FITS: readonly MediaFit[] = ["cover", "contain", "stretch", "tile"];

export type MediaStack = "over" | "under";

export interface Playback {
	autoplay: boolean;
	loop: boolean;
	muted: boolean;
	controls: boolean;
}

export type PlaybackKey = keyof Playback;

export const DEFAULT_PLAYBACK: Playback = {
	autoplay: true,
	loop: true,
	muted: true,
	controls: false,
};

export interface MediaFill extends Playback {
	asset: AssetId;
	fit: MediaFit;
	stack: MediaStack;
}

function isMediaFit(text: unknown): text is MediaFit {
	return MEDIA_FITS.some((fit) => fit === text);
}

function playbackOf(bag: Readonly<Record<string, unknown>>): Playback {
	const read = (key: PlaybackKey): boolean => {
		const value = bag[key];
		return typeof value === "boolean" ? value : DEFAULT_PLAYBACK[key];
	};
	return {
		autoplay: read("autoplay"),
		loop: read("loop"),
		muted: read("muted"),
		controls: read("controls"),
	};
}

export function mediaOf(value: unknown): MediaFill | null {
	const bag = bagOf(value);
	const { asset, fit, stack } = bag;
	if (typeof asset !== "string" || !isAssetId(asset)) {
		return null;
	}
	return {
		asset,
		fit: isMediaFit(fit) ? fit : "cover",
		stack: stack === "under" ? "under" : "over",
		...playbackOf(bag),
	};
}
