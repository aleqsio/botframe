import type { CSSProperties, ReactNode } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId, Rect } from "../document/layer";
import { droppedInto } from "./input/dropHighlight";
import { CORNERS, HANDLE_SIZE } from "./input/handles";
import type { SnapSegment } from "./input/snap";
import { useSelected } from "./state/useSelected";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useDrawnFrame, useDrawnSpace, useSelectionBox } from "./useDocument";
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

function boxStyle(box: Rect): CSSProperties {
	return {
		transform: `translate3d(${box.x}px, ${box.y}px, 0)`,
		width: `${box.width}px`,
		height: `${box.height}px`,
	};
}

function SoleFrame({ doc, id }: { doc: DesignDocument; id: LayerId }): ReactNode {
	return (
		<LayerFrame className="selection" doc={doc} id={id}>
			<PaddingBand doc={doc} id={id} />
			{CORNERS.map((corner) => (
				<span className="selection-handle" data-corner={corner} key={corner} />
			))}
		</LayerFrame>
	);
}

function GroupFrame({ doc, ids }: { doc: DesignDocument; ids: readonly LayerId[] }): ReactNode {
	const box = useSelectionBox(doc, ids);

	return (
		<>
			{ids.map((id) => (
				<LayerFrame className="selection-peer" doc={doc} id={id} key={id} />
			))}
			{box === null ? null : <div className="selection-box" style={boxStyle(box)} />}
		</>
	);
}

function SelectionFrame({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	const ids = useSlot(user.selection);
	const [id, peer] = ids;

	if (id === undefined) {
		return null;
	}
	return peer === undefined ? <SoleFrame doc={doc} id={id} /> : <GroupFrame doc={doc} ids={ids} />;
}

function Marquee({ user }: { user: UserState }): ReactNode {
	const box = useSlot(user.marquee);

	return box === null ? null : <div className="marquee" style={boxStyle(box)} />;
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
			<Marquee user={user} />
			<SnapLines doc={doc} user={user} />
		</>
	);
}
