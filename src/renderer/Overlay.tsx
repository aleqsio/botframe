import type { CSSProperties, ReactNode } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId, Rect } from "../document/layer";
import { OriginMark, SnapLines } from "./CanvasMarks";
import { droppedInto } from "./input/dropHighlight";
import { CORNERS, HANDLE_SIZE } from "./input/handles";
import { useSelected } from "./state/useSelected";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useDrawnOutline, useSelectionBox } from "./useDocument";
import type { DrawnOutline } from "./useDocument";

declare module "react" {
	interface CSSProperties {
		"--handle-size"?: string | undefined;
	}
}

const HANDLE_STYLE: CSSProperties = { "--handle-size": `${HANDLE_SIZE}px` };

function outlineStyle(outline: DrawnOutline): CSSProperties {
	return {
		transform: outline.transform,
		width: `${outline.width}px`,
		height: `${outline.height}px`,
		...HANDLE_STYLE,
	};
}

function CornerHandles(): ReactNode {
	return CORNERS.map((corner) => (
		<span className="selection-handle" data-corner={corner} key={corner} />
	));
}

function LayerOutline({
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
	const outline = useDrawnOutline(doc, id);

	if (outline === null) {
		return null;
	}

	return (
		<div className={className} style={outlineStyle(outline)}>
			{children}
		</div>
	);
}

const NO_PADDING = "0px 0px 0px 0px";

function PaddingBand({ doc, id }: { doc: DesignDocument; id: LayerId }): ReactNode {
	const outline = useDrawnOutline(doc, id);

	if (outline === null || outline.padding === NO_PADDING) {
		return null;
	}

	return <span className="selection-padding" style={{ borderWidth: outline.padding }} />;
}

function boxStyle(box: Rect): CSSProperties {
	return {
		transform: `translate3d(${box.x}px, ${box.y}px, 0)`,
		width: `${box.width}px`,
		height: `${box.height}px`,
	};
}

function SoleOutline({ doc, id }: { doc: DesignDocument; id: LayerId }): ReactNode {
	return (
		<LayerOutline className="selection" doc={doc} id={id}>
			<PaddingBand doc={doc} id={id} />
			<CornerHandles />
			<OriginMark doc={doc} id={id} />
		</LayerOutline>
	);
}

function GroupOutline({ doc, ids }: { doc: DesignDocument; ids: readonly LayerId[] }): ReactNode {
	const box = useSelectionBox(doc, ids);

	return (
		<>
			{ids.map((id) => (
				<LayerOutline className="selection-peer" doc={doc} id={id} key={id}>
					<OriginMark doc={doc} id={id} />
				</LayerOutline>
			))}
			{box === null ? null : (
				<div className="selection-box" style={{ ...boxStyle(box), ...HANDLE_STYLE }}>
					<CornerHandles />
				</div>
			)}
		</>
	);
}

function SelectionOutline({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	const ids = useSlot(user.selection);
	const [id, peer] = ids;

	if (id === undefined) {
		return null;
	}
	return peer === undefined ? (
		<SoleOutline doc={doc} id={id} />
	) : (
		<GroupOutline doc={doc} ids={ids} />
	);
}

function Marquee({ user }: { user: UserState }): ReactNode {
	const marquee = useSlot(user.marquee);

	return marquee === null ? null : <div className="marquee" style={boxStyle(marquee.box)} />;
}

function HighlightOutline({
	doc,
	id,
	user,
}: {
	doc: DesignDocument;
	id: LayerId;
	user: UserState;
}): ReactNode {
	return useSelected(user.selection, id) ? null : (
		<LayerOutline className="highlight" doc={doc} id={id} />
	);
}

function Drop({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	const id = droppedInto(useSlot(user.move), useSlot(user.rowDrag), (layerId) =>
		doc.layer(layerId),
	);

	return id === null ? null : <LayerOutline className="drop-outline" doc={doc} id={id} />;
}

function Highlight({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	const id = useSlot(user.highlight);

	return id === null ? null : <HighlightOutline doc={doc} id={id} user={user} />;
}

export function Overlay({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	return (
		<>
			<Drop doc={doc} user={user} />
			<Highlight doc={doc} user={user} />
			<SelectionOutline doc={doc} user={user} />
			<Marquee user={user} />
			<SnapLines doc={doc} user={user} />
		</>
	);
}
