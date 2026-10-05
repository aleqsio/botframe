import { assetOf } from "../../document/assets";
import type { Asset } from "../../document/assets";
import type { DesignDocument } from "../../document/document";
import { nextLayerName } from "../components/layerEntry";
import { drawnFields } from "../components/layerDefaults";
import { urlAsset } from "../components/mediaFile";
import { fillWithAsset, mediaDefaults } from "../components/mediaLayer";
import { pendingMediaOf } from "../mediaSize";
import { optionalText, textArg } from "./args";
import type { Args } from "./args";
import { bytesOf } from "./dataTools";
import { containerArg } from "./layerTools";

function edgeArg(args: Args, key: "x" | "y"): number {
	const value = args[key] ?? 0;
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new TypeError(`Give ${key} as a number.`);
	}
	return value;
}

function sourceAsset(args: Args): Promise<Asset | null> {
	const url = optionalText(args, "url");
	if (url !== null) {
		return urlAsset(url);
	}
	return assetOf(bytesOf(textArg(args, "base64")), textArg(args, "type"));
}

export async function placeMedia(doc: DesignDocument, args: Args): Promise<unknown> {
	const parent = containerArg(doc, args);
	const rect = { x: edgeArg(args, "x"), y: edgeArg(args, "y") };
	const media = await pendingMediaOf(await sourceAsset(args));
	if (media === null) {
		throw new TypeError("botframe could not load this media, or does not accept its type or size.");
	}
	const { asset, width, height } = media;
	const defaults = mediaDefaults(asset);
	const layers = doc.layerIds().map((held) => doc.layer(held));
	const name = nextLayerName(defaults.label, layers);
	const id = doc.createLayer(drawnFields(defaults, { ...rect, width, height }, name), parent);
	fillWithAsset(doc, id, asset);
	return { id, asset: asset.id, width, height };
}
