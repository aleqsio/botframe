import { useCallback, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { clipSourceOf } from "../document/clips";
import type { DesignDocument } from "../document/document";
import type { Layer, LayerId } from "../document/layer";
import { outlineVertices } from "../document/vertices";
import type { Vertex } from "../document/vertices";
import { pathData } from "./pathShape";
import { LayerOutline } from "./SelectionOutline";
import { shapeLinesOf } from "./shapeLines";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useDrawnOutline, useLayer } from "./useDocument";
import { subscribeLinks } from "./useLayerPaint";

const NO_SUBSCRIPTION = (): void => {};

export function PathLine({ vertices }: { vertices: readonly Vertex[] }): ReactNode {
	return (
		<svg className="path-lines" preserveAspectRatio="none" viewBox="0 0 1 1">
			<path d={pathData(vertices)} />
		</svg>
	);
}

export function ShapeLineOf({
	className,
	doc,
	id,
}: {
	className: string;
	doc: DesignDocument;
	id: LayerId;
}): ReactNode {
	const layer = useLayer(doc, id);
	const outline = useDrawnOutline(doc, id);
	const vertices =
		layer === null || outline === null ? null : outlineVertices(layer.geometry, outline);

	return vertices === null ? null : (
		<LayerOutline className={className} doc={doc} id={id}>
			<PathLine vertices={vertices} />
		</LayerOutline>
	);
}

function useClipSourceId(doc: DesignDocument, layer: Layer | null): LayerId | null {
	return useSyncExternalStore(
		useCallback(
			(listener: () => void) =>
				layer === null ? NO_SUBSCRIPTION : subscribeLinks(doc, layer, listener),
			[doc, layer],
		),
		useCallback(
			() => (layer === null ? null : (clipSourceOf((at) => doc.layer(at), layer)?.id ?? null)),
			[doc, layer],
		),
	);
}

function SelectedShape({
	doc,
	id,
	user,
}: {
	doc: DesignDocument;
	id: LayerId;
	user: UserState;
}): ReactNode {
	const layer = useLayer(doc, id);
	const mask = useClipSourceId(doc, layer);
	const edited = useSlot(user.pathEdit);
	const lines = layer === null ? [] : shapeLinesOf(layer, mask, edited);

	return lines.map((line) => (
		<ShapeLineOf
			className={line.mask ? "shape-line shape-line-mask" : "shape-line"}
			doc={doc}
			id={line.id}
			key={line.id}
		/>
	));
}

export function SelectedShapes({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	return useSlot(user.selection).map((id) => (
		<SelectedShape doc={doc} id={id} key={id} user={user} />
	));
}
