import type { CSSProperties, ReactNode } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId, Rect } from "../document/layer";
import { droppedInto } from "./input/dropHighlight";
import { CORNERS, HANDLE_SIZE } from "./input/handles";
import type { SnapSegment } from "./input/snap";
import { useSelected } from "./state/useSelected";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useDrawnFrame, useDrawnSpace, useGroupFrame } from "./useDocument";
import type { DrawnFrame } from "./useDocument";

declare module "react" {
	interface CSSProperties {
		"--handle-size"?: string | undefined;
	}
}

function frameStyle(frame: DrawnFrame): CSSProperties {
	return {
		transform: frame.transform,
		width: `${frame.width}px`,
		height: `${frame.height}px`,
		"--handle-size": `${HANDLE_SIZE}px`,
	};
}

function groupStyle(frame: Rect): CSSProperties {
	return frameStyle({
		transform: `translate3d(${frame.x}px, ${frame.y}px, 0)`,
		width: frame.width,
		height: frame.height,
		padding: NO_PADDING,
	});
}

function Handles(): ReactNode {
	return CORNERS.map((corner) => (
		<span className="selection-handle" data-corner={corner} key={corner} />
	));
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
	const frame = useDrawnFrame(doc, id);

	if (frame === null) {
		return null;
	}

	return (
		<div className={className} style={frameStyle(frame)}>
			{children}
		</div>
	);
}

const NO_PADDING = "0px 0px 0px 0px";

function PaddingBand({ doc, id }: { doc: DesignDocument; id: LayerId }): ReactNode {
	const frame = useDrawnFrame(doc, id);

	if (frame === null || frame.padding === NO_PADDING) {
		return null;
	}

	return <span className="selection-padding" style={{ borderWidth: frame.padding }} />;
}

function GroupFrame({ doc, ids }: { doc: DesignDocument; ids: readonly LayerId[] }): ReactNode {
	const frame = useGroupFrame(doc, ids);

	return frame === null ? null : (
		<>
			<div className="selection" style={groupStyle(frame)}>
				<Handles />
			</div>
			{ids.map((id) => (
				<LayerFrame className="selection-peer" doc={doc} id={id} key={id} />
			))}
		</>
	);
}

function SelectionFrame({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	const ids = useSlot(user.selection);
	const [id] = ids;

	if (id === undefined) {
		return null;
	}
	if (ids.length > 1) {
		return <GroupFrame doc={doc} ids={ids} />;
	}
	return (
		<LayerFrame className="selection" doc={doc} id={id}>
			<PaddingBand doc={doc} id={id} />
			<Handles />
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
	const along = `${segment.to - segment.from}px`;
	if (segment.axis === "x") {
		return { transform: `translate3d(${segment.at}px, ${segment.from}px, 0)`, height: along };
	}
	return { transform: `translate3d(${segment.from}px, ${segment.at}px, 0)`, width: along };
}

function SnapLines({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	const snap = useSlot(user.snap);
	const space = useDrawnSpace(doc, snap?.parent ?? null);

	return snap === null ? null : (
		<div className="snap-space" style={{ transform: space }}>
			{snap.segments.map((segment) => (
				<span
					className="snap-line"
					data-axis={segment.axis}
					key={segment.axis}
					style={snapLineStyle(segment)}
				/>
			))}
		</div>
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
