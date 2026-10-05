import { useState } from "react";
import type { ReactElement } from "react";
import type { Layer } from "../../document/layer";
import type { ImageFile } from "../../shared/exportImage";
import type { DesignDocument } from "../../document/document";
import { NEEDS_DESKTOP, bridge, inBrowser } from "../bridge";
import { exportPng } from "../export/capture";
import type { UserState } from "../state/userState";
import { Segmented } from "./layout/Segmented";
import { layerEntry } from "./layerEntry";

type Scale = "1" | "2" | "3";

const SCALES = (["1", "2", "3"] as const).map((value) => ({ value, label: `${value}x` }));
const EXPORT_LONG_SIDE = 16_384;

interface ExportProps {
	doc: DesignDocument;
	layers: readonly Layer[];
	user: UserState;
}

async function exportLayer(props: ExportProps, layer: Layer, scale: Scale): Promise<ImageFile> {
	const request = { target: layer.id, scale: Number(scale), longSide: EXPORT_LONG_SIDE };
	const bytes = await exportPng(props.doc, props.user, request);
	return { name: layerEntry(layer).label, bytes };
}

async function exportLayers(props: ExportProps, scale: Scale): Promise<void> {
	const files = await Promise.all(props.layers.map((layer) => exportLayer(props, layer, scale)));
	await bridge().saveImages(files);
}

export function ExportSection(props: ExportProps): ReactElement {
	const [scale, setScale] = useState<Scale>("1");
	const [busy, setBusy] = useState(false);
	const [failure, setFailure] = useState<string | null>(null);
	const blocked = busy || inBrowser();
	const note = inBrowser() ? NEEDS_DESKTOP : failure;

	return (
		<section aria-label="Export" className="field-group layout-section">
			<span className="group-label">Export</span>
			<div className="export-row">
				<Segmented label="Scale" onPick={setScale} options={SCALES} value={scale} />
				<button
					aria-disabled={blocked}
					className="pill-button component-action export-button"
					onClick={() => {
						if (blocked) {
							return;
						}
						setBusy(true);
						setFailure(null);
						exportLayers(props, scale)
							.catch((error: unknown) => {
								setFailure(error instanceof Error ? error.message : String(error));
							})
							.finally(() => {
								setBusy(false);
							});
					}}
					type="button"
				>
					Export PNG
				</button>
			</div>
			{note === null ? null : <p className="panel-note">{note}</p>}
		</section>
	);
}
