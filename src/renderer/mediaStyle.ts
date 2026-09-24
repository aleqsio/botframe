import type { CSSProperties } from "react";
import type { MediaFit } from "../document/media";
import type { AssetUrl } from "./assetUrl";

const IMAGE_PLACE: Readonly<Record<MediaFit, string>> = {
	cover: "center / cover no-repeat",
	contain: "center / contain no-repeat",
	stretch: "0 0 / 100% 100% no-repeat",
	tile: "0 0 / auto repeat",
};

const VIDEO_FIT: Readonly<Record<MediaFit, CSSProperties["objectFit"]>> = {
	cover: "cover",
	contain: "contain",
	stretch: "fill",
	tile: "none",
};

export function imageBackground(fill: string, url: string, fit: MediaFit): string {
	return `url("${url}") ${IMAGE_PLACE[fit]}, ${fill}`;
}

export function paintedStyle(
	style: CSSProperties,
	fit: MediaFit | null,
	media: AssetUrl | null,
): CSSProperties {
	if (fit === null || media?.kind !== "image" || typeof style.background !== "string") {
		return style;
	}
	return { ...style, background: imageBackground(style.background, media.url, fit) };
}

export function videoStyle(fit: MediaFit): CSSProperties {
	return { objectFit: VIDEO_FIT[fit] };
}
