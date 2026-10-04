import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { TextGeometry, TextStyle } from "../../../document/text";
import { FACTOR_STEP, LENGTH_STEP } from "../../input/step";
import { LayerChip } from "../layout/LayerChip";
import { NumberChip } from "../layout/NumberChip";
import { Segmented } from "../layout/Segmented";
import { useFontFaces } from "../../fonts/FontFaces";
import { FontRows } from "./FontRows";
import { ContentRow, TEXT_MESSAGE, fontSizeField } from "./textFields";
import { useGoogleFamilies } from "./useGoogleFamilies";
import { ALIGN_OPTIONS, CASE_OPTIONS, DECORATION_OPTIONS, VERTICAL_OPTIONS } from "./textOptions";

const LINE_BOUND = { kind: "clamp", min: 0.1, max: 10 } as const;
const SPACING_BOUND = { kind: "clamp", min: -100, max: 100 } as const;

interface TextChange {
	doc: DesignDocument;
	layer: Layer;
	geometry: TextGeometry;
	write: (change: Partial<TextStyle>) => void;
	commit: () => void;
}

function NumberRows({ commit, doc, geometry, layer, write }: TextChange): ReactElement {
	return (
		<>
			<div className="chip-row">
				<LayerChip doc={doc} field={fontSizeField(geometry)} layer={layer} />
				<NumberChip
					bound={LINE_BOUND}
					label="Line"
					name="Line height"
					onCommit={commit}
					onValue={(lineHeight) => {
						write({ lineHeight });
					}}
					step={FACTOR_STEP}
					unit="×"
					value={geometry.lineHeight}
				/>
			</div>
			<div className="chip-row">
				<NumberChip
					bound={SPACING_BOUND}
					label="Spacing"
					name="Letter spacing"
					onCommit={commit}
					onValue={(letterSpacing) => {
						write({ letterSpacing });
					}}
					step={LENGTH_STEP}
					unit="px"
					value={geometry.letterSpacing}
				/>
			</div>
		</>
	);
}

function ChoiceRows({ commit, geometry, write }: TextChange): ReactElement {
	const pick = (change: Partial<TextStyle>): void => {
		write(change);
		commit();
	};
	return (
		<>
			<span className="layout-sub">Align</span>
			<div className="chip-row">
				<Segmented
					label="Horizontal alignment"
					onPick={(textAlign) => {
						pick({ textAlign });
					}}
					options={ALIGN_OPTIONS}
					value={geometry.textAlign}
				/>
			</div>
			<div className="chip-row">
				<Segmented
					label="Vertical alignment"
					onPick={(verticalAlign) => {
						pick({ verticalAlign });
					}}
					options={VERTICAL_OPTIONS}
					value={geometry.verticalAlign}
				/>
			</div>
			<span className="layout-sub">Decoration</span>
			<div className="chip-row">
				<Segmented
					label="Decoration"
					onPick={(decoration) => {
						pick({ decoration });
					}}
					options={DECORATION_OPTIONS}
					value={geometry.decoration}
				/>
			</div>
			<span className="layout-sub">Case</span>
			<div className="chip-row">
				<Segmented
					label="Case"
					onPick={(textCase) => {
						pick({ textCase });
					}}
					options={CASE_OPTIONS}
					value={geometry.textCase}
				/>
			</div>
		</>
	);
}

export function TextSection({
	doc,
	geometry,
	layer,
}: {
	doc: DesignDocument;
	geometry: TextGeometry;
	layer: Layer;
}): ReactElement {
	const families = useGoogleFamilies();
	const inFile = new Set(useFontFaces(doc).map((face) => face.family));
	const change: TextChange = {
		doc,
		layer,
		geometry,
		write: (style) => {
			doc.update(layer.id, { geometry: { ...geometry, ...style } });
		},
		commit: () => {
			doc.commit(TEXT_MESSAGE);
		},
	};

	return (
		<section className="layout-section">
			<header className="layout-head">
				<span className="group-label">Text</span>
			</header>
			<ContentRow doc={doc} geometry={geometry} layer={layer} />
			<FontRows
				families={families}
				geometry={geometry}
				inFile={inFile}
				pick={(style) => {
					change.write(style);
					change.commit();
				}}
			/>
			<NumberRows {...change} />
			<ChoiceRows {...change} />
		</section>
	);
}
