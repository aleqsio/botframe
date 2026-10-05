import { useState } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { EXPORT_FORMATS } from "../../shared/exportFile";
import type { ExportFormat, ExportedFile } from "../../shared/exportFile";
import { bridge } from "../bridge";
import { exportFile } from "../export/capture";
import type { UserState } from "../state/userState";
import { Segmented } from "./layout/Segmented";
import { layerEntry } from "./layerEntry";

type Scale = "1" | "2" | "3";
type HtmlFiles = "embedded" | "separate";
type Picked = Exclude<ExportFormat, "zip">;

interface ExportProps {
	doc: DesignDocument;
	layers: readonly Layer[];
	user: UserState;
}

interface Choice {
	format: ExportFormat;
	scale: Scale;
}

const FORMATS = EXPORT_FORMATS.flatMap(({ id, label, title }) =>
	id === "zip" ? [] : [{ value: id, label, title }],
);
const HTML_FILES = [
	{
		value: "embedded",
		label: "Embedded",
		title: "One HTML file with the CSS, fonts, and media inside",
	},
	{ value: "separate", label: "Separate", title: "HTML, CSS, and asset files in a ZIP" },
] as const;
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

function formatOf(picked: Picked, files: HtmlFiles): ExportFormat {
	return picked === "html" && files === "separate" ? "zip" : picked;
}

function OptionRow({
	picked,
	files,
	scale,
	onFiles,
	onScale,
}: {
	picked: Picked;
	files: HtmlFiles;
	scale: Scale;
	onFiles: (files: HtmlFiles) => void;
	onScale: (scale: Scale) => void;
}): ReactElement {
	if (picked === "html") {
		return <Segmented label="HTML files" onPick={onFiles} options={HTML_FILES} value={files} />;
	}
	const disabled = !isRaster(picked);
	const scales = SCALE_VALUES.map((value) => ({ value, label: `${value}x`, disabled }));
	return <Segmented label="Scale" onPick={onScale} options={scales} value={scale} />;
}

export function ExportSection(props: ExportProps): ReactElement {
	const [picked, setPicked] = useState<Picked>("png");
	const [files, setFiles] = useState<HtmlFiles>("embedded");
	const [scale, setScale] = useState<Scale>("1");
	const [busy, setBusy] = useState(false);
	const [failure, setFailure] = useState<string | null>(null);
	const format = formatOf(picked, files);
	return (
		<section aria-label="Export" className="field-group layout-section">
			<span className="group-label">Export</span>
			<Segmented label="Format" onPick={setPicked} options={FORMATS} value={picked} />
			<div className="export-row">
				<OptionRow
					files={files}
					onFiles={setFiles}
					onScale={setScale}
					picked={picked}
					scale={scale}
				/>
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
