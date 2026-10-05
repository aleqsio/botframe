import { useState } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { EXPORT_FORMATS } from "../../shared/exportFile";
import type { ExportFormat, ExportedFile } from "../../shared/exportFile";
import { bridge, inBrowser } from "../bridge";
import { exportFile } from "../export/capture";
import type { UserState } from "../state/userState";
import { Segmented } from "./layout/Segmented";
import { layerEntry } from "./layerEntry";

type Scale = "1" | "2" | "3";

interface ExportProps {
	doc: DesignDocument;
	layers: readonly Layer[];
	user: UserState;
}

interface Choice {
	format: ExportFormat;
	scale: Scale;
}

const FORMATS = EXPORT_FORMATS.map(({ id, label, title }) => ({ value: id, label, title }));
const SCALE_VALUES = ["1", "2", "3"] as const;
const EXPORT_LONG_SIDE = 16_384;

function isRaster(format: ExportFormat): boolean {
	return EXPORT_FORMATS.some((held) => held.id === format && held.raster);
}

async function exportLayer(
	props: ExportProps,
	layer: Layer,
	choice: Choice,
): Promise<ExportedFile> {
	const scale = isRaster(choice.format) ? Number(choice.scale) : 1;
	const request = { target: layer.id, format: choice.format, scale, longSide: EXPORT_LONG_SIDE };
	const bytes = await exportFile(props.doc, props.user, request);
	return { name: layerEntry(layer).label, format: choice.format, bytes };
}

async function exportLayers(props: ExportProps, choice: Choice): Promise<void> {
	const files = await Promise.all(props.layers.map((layer) => exportLayer(props, layer, choice)));
	await bridge().saveExports(files);
}

function errorText(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function ExportSection(props: ExportProps): ReactElement | null {
	const [format, setFormat] = useState<ExportFormat>("png");
	const [scale, setScale] = useState<Scale>("1");
	const [busy, setBusy] = useState(false);
	const [failure, setFailure] = useState<string | null>(null);
	const raster = isRaster(format);
	const scales = SCALE_VALUES.map((value) => ({ value, label: `${value}x`, disabled: !raster }));

	if (inBrowser()) {
		return null;
	}
	return (
		<section aria-label="Export" className="field-group layout-section">
			<span className="group-label">Export</span>
			<Segmented label="Format" onPick={setFormat} options={FORMATS} value={format} />
			<div className="export-row">
				<Segmented label="Scale" onPick={setScale} options={scales} value={scale} />
				<button
					aria-disabled={busy}
					className="pill-button component-action export-button"
					onClick={() => {
						if (busy) {
							return;
						}
						setBusy(true);
						setFailure(null);
						exportLayers(props, { format, scale })
							.catch((error: unknown) => {
								setFailure(errorText(error));
							})
							.finally(() => {
								setBusy(false);
							});
					}}
					type="button"
				>
					Export
				</button>
			</div>
			{failure === null ? null : <p className="panel-note">{failure}</p>}
		</section>
	);
}
