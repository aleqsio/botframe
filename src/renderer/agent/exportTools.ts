import { RENDER_LONG_SIDE } from "../../shared/agent";
import type { AgentImage, AgentResource } from "../../shared/agent";
import { EXPORT_FORMATS } from "../../shared/exportFile";
import type { FormatInfo } from "../../shared/exportFile";
import { layerEntry } from "../components/layerEntry";
import { base64Of } from "../export/base64";
import { exportFile } from "../export/capture";
import type { Tab } from "../state/tab";
import { layerArg, textArg } from "./args";
import type { Args } from "./args";

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;
const TEXT_FORMATS: ReadonlySet<string> = new Set(["html", "svg"]);

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

function formatArg(args: Args): FormatInfo {
	const id = textArg(args, "format");
	const format = EXPORT_FORMATS.find((held) => held.id === id);
	if (format === undefined) {
		const ids = EXPORT_FORMATS.map((held) => held.id).join(", ");
		throw new TypeError(`Give format as one of ${ids}.`);
	}
	return format;
}

function targetArg(tab: Tab, args: Args): ReturnType<typeof layerArg> | null {
	return args["id"] === undefined ? null : layerArg(tab.doc, args["id"]);
}

export async function render(tab: Tab, args: Args): Promise<AgentImage> {
	const request = { target: targetArg(tab, args), format: "png" as const, scale: scaleArg(args) };
	const bytes = await exportFile(tab.doc, tab.user, { ...request, longSide: RENDER_LONG_SIDE });
	return { type: "image", data: base64Of(bytes), mimeType: "image/png" };
}

export async function exportLayer(tab: Tab, args: Args): Promise<AgentResource> {
	const format = formatArg(args);
	const target = targetArg(tab, args);
	const scale = format.raster ? scaleArg(args) : 1;
	const bytes = await exportFile(tab.doc, tab.user, {
		target,
		format: format.id,
		scale,
		longSide: RENDER_LONG_SIDE,
	});
	const layer = target === null ? null : tab.doc.layer(target);
	const name = layer === null ? "canvas" : layerEntry(layer).label;
	const uri = `botframe://export/${encodeURIComponent(name)}.${format.id}`;
	const resource = TEXT_FORMATS.has(format.id)
		? { uri, mimeType: format.type, text: new TextDecoder().decode(bytes) }
		: { uri, mimeType: format.type, blob: base64Of(bytes) };
	return { type: "resource", resource };
}
