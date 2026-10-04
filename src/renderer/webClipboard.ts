import { HTML_FLAVOR, LAYERS_FLAVOR, TEXT_FLAVOR } from "../shared/clipboard";
import type { ClipboardWrite } from "../shared/clipboard";

function blobOf(text: string, type: string): Blob {
	return new Blob([text], { type });
}

export function writesLayers(): boolean {
	return ClipboardItem.supports(LAYERS_FLAVOR);
}

function blobsOf(write: ClipboardWrite): Record<string, Blob> {
	const blobs: Record<string, Blob> = {
		[TEXT_FLAVOR]: blobOf(write.html, TEXT_FLAVOR),
		[HTML_FLAVOR]: blobOf(write.html, HTML_FLAVOR),
	};
	if (write.layers !== null && writesLayers()) {
		blobs[LAYERS_FLAVOR] = blobOf(write.layers, LAYERS_FLAVOR);
	}
	return blobs;
}

export async function writeClipboard(write: ClipboardWrite): Promise<void> {
	await navigator.clipboard.write([new ClipboardItem(blobsOf(write))]);
}

async function layersOf(items: readonly ClipboardItem[]): Promise<string | null> {
	const item = items.find((entry) => entry.types.includes(LAYERS_FLAVOR));
	return item === undefined ? null : (await item.getType(LAYERS_FLAVOR)).text();
}

export async function readClipboardLayers(): Promise<string | null> {
	try {
		return await layersOf(await navigator.clipboard.read());
	} catch {
		return null;
	}
}
