import type { CSSProperties, ReactNode } from "react";
import type { DesignDocument } from "../document/document";
import type { Layer, LayerId } from "../document/layer";
import { droppedInto } from "./input/dropHighlight";
import { CORNERS, HANDLE_SIZE } from "./input/handles";
import type { SnapSegment } from "./input/snap";
import { layerTransform } from "./layerStyle";
import { useSelected } from "./state/useSelected";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useLayer } from "./useDocument";

declare module "react" {
	interface CSSProperties {
		"--handle-size"?: string | undefined;
	}
}

function frameStyle(layer: Layer): CSSProperties {
	return {
		transform: layerTransform(layer),
		width: `${layer.width}px`,
		height: `${layer.height}px`,
		"--handle-size": `${HANDLE_SIZE}px`,
	};
}

function ParentSpace({
	doc,
	id,
	children,
}: {
	doc: DesignDocument;
	id: LayerId | null;
	children: ReactNode;
}): ReactNode {
	const layer = useLayer(doc, id);

	if (layer === null) {
		return children;
	}

	return (
		<ParentSpace doc={doc} id={layer.parent}>
			<div className="layer-space" style={{ transform: layerTransform(layer) }}>
				{children}
			</div>
		</ParentSpace>
	);
}

function LayerFrame({
	className,
	doc,
	id,
	children,
}: {
	className: string;
	doc: DesignDocument;
	id: LayerId;
	children?: ReactNode;
}): ReactNode {
	const layer = useLayer(doc, id);

	if (layer === null) {
		return null;
	}

	return (
		<ParentSpace doc={doc} id={layer.parent}>
			<div className={className} style={frameStyle(layer)}>
				{children}
			</div>
		</ParentSpace>
	);
}

function SelectionFrame({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	const [id] = useSlot(user.selection);

	return id === undefined ? null : (
		<LayerFrame className="selection" doc={doc} id={id}>
			{CORNERS.map((corner) => (
				<span className="selection-handle" data-corner={corner} key={corner} />
			))}
		</LayerFrame>
	);
}

function HighlightFrame({
	doc,
	id,
	user,
}: {
	doc: DesignDocument;
	id: LayerId;
	user: UserState;
}): ReactNode {
	return useSelected(user.selection, id) ? null : (
		<LayerFrame className="highlight" doc={doc} id={id} />
	);
}

function Drop({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	const id = droppedInto(useSlot(user.move), useSlot(user.rowDrag), (layerId) =>
		doc.layer(layerId),
	);

	return id === null ? null : <LayerFrame className="drop-frame" doc={doc} id={id} />;
}

function Highlight({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	const id = useSlot(user.highlight);

	return id === null ? null : <HighlightFrame doc={doc} id={id} user={user} />;
}

function snapLineStyle(segment: SnapSegment): CSSProperties {
	const along = segment.to - segment.from;
	if (segment.axis === "x") {
		return {
			transform: `translate3d(${segment.at}px, ${segment.from}px, 0)`,
			height: `${along}px`,
		};
	}
	return { transform: `translate3d(${segment.from}px, ${segment.at}px, 0)`, width: `${along}px` };
}

function SnapLines({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	const snap = useSlot(user.snap);

	return snap === null ? null : (
		<ParentSpace doc={doc} id={snap.parent}>
			{snap.segments.map((segment) => (
				<span
					className="snap-line"
					data-axis={segment.axis}
					key={segment.axis}
					style={snapLineStyle(segment)}
				/>
			))}
		</ParentSpace>
	);
}

export function Overlay({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	return (
		<>
			<Drop doc={doc} user={user} />
			<Highlight doc={doc} user={user} />
			<SelectionFrame doc={doc} user={user} />
			<SnapLines doc={doc} user={user} />
		</>
	);
}
