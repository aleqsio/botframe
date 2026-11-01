import { assetKind } from "../../document/assets";
import type { Asset } from "../../document/assets";
import type { DesignDocument } from "../../document/document";
import type { LayerId, Rect } from "../../document/layer";
import { DEFAULT_PLAYBACK } from "../../document/media";
import type { Point } from "../state/camera";
import type { PendingMedia } from "../state/userState";
import type { DrawDefaults } from "./layerDefaults";

const MEDIA_GEOMETRY = {
	kind: "rectangle",
	cornerRadius: 0,
	cornerSmoothing: 0,
	frame: false,
} as const;

const CLEAR = "#00000000";

const IMAGE_DEFAULTS: DrawDefaults = {
	label: "Image",
	fill: CLEAR,
	clip: false,
	level: false,
	geometry: MEDIA_GEOMETRY,
};

const VIDEO_DEFAULTS: DrawDefaults = { ...IMAGE_DEFAULTS, label: "Video" };

export function mediaDefaults(asset: Asset): DrawDefaults {
	return assetKind(asset.type) === "video" ? VIDEO_DEFAULTS : IMAGE_DEFAULTS;
}

export function naturalRect(media: PendingMedia, center: Point): Rect {
	return {
		x: center.x - media.width / 2,
		y: center.y - media.height / 2,
		width: media.width,
		height: media.height,
	};
}

export function fillWithAsset(doc: DesignDocument, id: LayerId, asset: Asset): void {
	doc.assets.put(asset);
	doc.update(id, { media: { asset: asset.id, fit: "cover", stack: "over", ...DEFAULT_PLAYBACK } });
}
