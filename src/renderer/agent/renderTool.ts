import { RENDER_LONG_SIDE } from "../../shared/agent";
import type { AgentImage } from "../../shared/agent";
import { IMAGE_TYPE } from "../../shared/exportImage";
import { exportPng } from "../export/capture";
import type { Tab } from "../state/tab";
import { layerArg } from "./args";
import type { Args } from "./args";

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;
const CHUNK = 0x80_00;

function scaleArg(args: Args): number {
	const { scale } = args;
	if (scale === undefined) {
		return 1;
	}
	if (typeof scale !== "number" || !(scale >= MIN_SCALE && scale <= MAX_SCALE)) {
		throw new TypeError(`Give scale as a number from ${MIN_SCALE} to ${MAX_SCALE}.`);
	}
	return scale;
}

function base64Of(bytes: Uint8Array): string {
	let text = "";
	for (let start = 0; start < bytes.length; start += CHUNK) {
		text += String.fromCodePoint(...bytes.subarray(start, start + CHUNK));
	}
	return btoa(text);
}

export async function render(tab: Tab, args: Args): Promise<AgentImage> {
	const target = args["id"] === undefined ? null : layerArg(tab.doc, args["id"]);
	const request = { target, scale: scaleArg(args), longSide: RENDER_LONG_SIDE };
	const bytes = await exportPng(tab.doc, tab.user, request);
	return { type: "image", data: base64Of(bytes), mimeType: IMAGE_TYPE };
}
