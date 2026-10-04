import type { CSSProperties } from "react";
import type { MediaFill, MediaFit, MediaStack } from "../document/media";
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

function paintImage(fill: string): string {
	return fill.includes("gradient(") ? fill : `linear-gradient(${fill}, ${fill})`;
}

export function imageBackground(
	fill: string,
	url: string,
	fit: MediaFit,
	stack: MediaStack,
): string {
	const image = `url("${url}") ${IMAGE_PLACE[fit]}`;
	return stack === "over" ? `${image}, ${fill}` : `${paintImage(fill)}, ${image}`;
}

export function paintedStyle(
	style: CSSProperties,
	fill: MediaFill | null,
	media: AssetUrl | null,
): CSSProperties {
	if (fill === null || media?.kind !== "image" || typeof style.background !== "string") {
		return style;
	}
	return {
		...style,
		background: imageBackground(style.background, media.url, fill.fit, fill.stack),
	};
}

export function videoStyle(fit: MediaFit): CSSProperties {
	return { objectFit: VIDEO_FIT[fit] };
}
