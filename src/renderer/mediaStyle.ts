import type { CSSProperties } from "react";
import type { MediaFill, MediaFit, MediaStack } from "../document/media";
import type { AssetUrl } from "./assetUrl";
import { parseColor } from "./components/color";

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

const ONE_GRADIENT = /^(?:repeating-)?(?:linear|radial|conic)-gradient\(/u;

function closesAtEnd(text: string): boolean {
	const body = text.slice(text.indexOf("("));
	let depth = 0;
	return Array.from(body).every((character, index) => {
		depth += character === "(" ? 1 : 0;
		depth -= character === ")" ? 1 : 0;
		return depth > 0 || index === body.length - 1;
	});
}

function paintLayer(fill: string): string | null {
	const text = fill.trim();
	if (ONE_GRADIENT.test(text) && closesAtEnd(text)) {
		return text;
	}
	return parseColor(text) === null ? null : `linear-gradient(${text}, ${text})`;
}

export function imageBackground(
	fill: string,
	url: string,
	fit: MediaFit,
	stack: MediaStack,
): string {
	const image = `url("${url}") ${IMAGE_PLACE[fit]}`;
	const layer = stack === "under" ? paintLayer(fill) : null;
	return layer === null ? `${image}, ${fill}` : `${layer}, ${image}`;
}

export function paintedStyle(
	style: CSSProperties,
	fill: MediaFill | null,
	media: AssetUrl | null,
): CSSProperties {
	if (fill === null || media === null || typeof style.background !== "string") {
		return style;
	}
	if (media.kind === "video") {
		return fill.stack === "under" ? { ...style, background: "none" } : style;
	}
	return {
		...style,
		background: imageBackground(style.background, media.url, fill.fit, fill.stack),
	};
}

export function videoStyle(fit: MediaFit): CSSProperties {
	return { objectFit: VIDEO_FIT[fit] };
}
