import type { CSSProperties, ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId } from "../document/layer";
import type { DisplayMode } from "../document/layout";
import { canvasLabelStyle } from "./canvasLabel";
import { useShadowWriter } from "./componentShadow";
import { isRootFrame, layerEntry } from "./components/layerEntry";
import { useAssetUrl } from "./assetUrl";
import { GuideLines } from "./GuideLines";
import { LayerVideo } from "./LayerVideo";
import { layerStyle } from "./layerStyle";
import { paintedStyle } from "./mediaStyle";
import type { Slot } from "./state/slot";
import type { Lifted } from "./state/userState";
import { useLift, NOT_LIFTED } from "./state/useLift";
import { useSelected } from "./state/useSelected";
import { useChildIds, useLayer } from "./useDocument";

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
}: {
	doc: DesignDocument;
	id: LayerId;
	lift: Slot<Lifted | null>;
	parentDisplay: DisplayMode | null;
	selection: Slot<readonly LayerId[]>;
}): ReactElement | null {
	const layer = useLayer(doc, id);
	const childIds = useChildIds(doc, id);
	const selected = useSelected(selection, id);
	const lifted = useLift(lift, id);
	const fit = layer?.media?.fit ?? null;
	const media = useAssetUrl(doc.assets, layer?.media?.asset ?? null);
	const writeShadow = useShadowWriter(doc, layer?.content ?? null);

	if (layer === null) {
		return null;
	}

	return (
		<div
			className="layer"
			data-dragging={lifted === NOT_LIFTED ? undefined : ""}
			data-layer-id={id}
			data-selected={selected ? "" : undefined}
			ref={writeShadow}
			style={liftedStyle(paintedStyle(layerStyle(layer, parentDisplay), fit, media), lifted)}
		>
			<LayerVideo fit={fit} media={media} />
			{childIds.map((childId) => (
				<LayerView
					doc={doc}
					id={childId}
					key={childId}
					lift={lift}
					parentDisplay={layer.layout.display}
					selection={selection}
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
