import type { CSSProperties, ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId } from "../document/layer";
import type { DisplayMode } from "../document/layout";
import { canvasLabelStyle } from "./canvasLabel";
import { useShadowWriter } from "./componentShadow";
import { isRootFrame, layerEntry } from "./components/layerEntry";
import { GuideLines } from "./GuideLines";
import { LayerBody } from "./LayerBody";
import type { Slot } from "./state/slot";
import { useLift, NOT_LIFTED } from "./state/useLift";
import type { LiftSlot } from "./state/useLift";
import { useSelected } from "./state/useSelected";
import type { TextEdit } from "./state/userState";
import { useChildIds, useLayer } from "./useDocument";
import { useLayerPaint } from "./useLayerPaint";

function liftedStyle(style: CSSProperties, lift: string): CSSProperties {
	return lift === NOT_LIFTED
		? style
		: { ...style, transform: `${lift} ${style.transform ?? ""}`.trimEnd() };
}

export function LayerView({
	doc,
	id,
	lift,
	parentDisplay,
	selection,
	textEdit,
}: {
	doc: DesignDocument;
	id: LayerId;
	lift: LiftSlot;
	parentDisplay: DisplayMode | null;
	selection: Slot<readonly LayerId[]>;
	textEdit: Slot<TextEdit | null>;
}): ReactElement | null {
	const layer = useLayer(doc, id);
	const childIds = useChildIds(doc, id);
	const selected = useSelected(selection, id);
	const lifted = useLift(lift, id);
	const writeShadow = useShadowWriter(doc, layer?.content ?? null);
	const paint = useLayerPaint(doc, layer, parentDisplay);

	if (layer === null || paint.style === null) {
		return null;
	}

	return (
		<div
			className="layer"
			data-dragging={lifted === NOT_LIFTED ? undefined : ""}
			data-layer-id={id}
			data-paint={layer.geometry.kind === "path" ? "path" : undefined}
			data-selected={selected ? "" : undefined}
			ref={writeShadow}
			style={liftedStyle(paint.style, lifted)}
		>
			<LayerBody doc={doc} layer={layer} media={paint.media} slots={{ selection, textEdit }} />
			{childIds.map((childId) => (
				<LayerView
					doc={doc}
					id={childId}
					key={childId}
					lift={lift}
					parentDisplay={layer.layout.display}
					selection={selection}
					textEdit={textEdit}
				/>
			))}
			<GuideLines guides={layer.guides} />
		</div>
	);
}

export function FrameLabel({
	doc,
	id,
	selection,
}: {
	doc: DesignDocument;
	id: LayerId;
	selection: Slot<readonly LayerId[]>;
}): ReactElement | null {
	const layer = useLayer(doc, id);
	const selected = useSelected(selection, id);

	if (layer === null || !isRootFrame(layer)) {
		return null;
	}

	return (
		<div
			className="frame-label"
			data-layer-id={id}
			data-selected={selected ? "" : undefined}
			style={canvasLabelStyle(layer)}
		>
			{layerEntry(layer).label}
		</div>
	);
}
