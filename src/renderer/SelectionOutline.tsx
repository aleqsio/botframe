import type { CSSProperties, ReactNode } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId, Rect } from "../document/layer";
import { GroupPivotMark, OriginMark } from "./CanvasMarks";
import { CORNERS, HANDLE_SIZE } from "./input/handles";
import { SkewMarks } from "./SkewMarks";
import { unscaled, zoomed, zoomedLengths } from "./screenSpace";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useDrawnOutline, useSelectionBox } from "./useDocument";
import type { DrawnOutline } from "./useDocument";

declare module "react" {
	interface CSSProperties {
		"--handle-size"?: string | undefined;
		"--upright"?: string | undefined;
	}
}

const HANDLE_STYLE: CSSProperties = { "--handle-size": `${HANDLE_SIZE}px` };

function outlineStyle(outline: DrawnOutline): CSSProperties {
	return {
		transform: unscaled(outline.transform),
		width: zoomed(outline.width),
		height: zoomed(outline.height),
		"--upright": outline.upright,
		...HANDLE_STYLE,
	};
}

function CornerHandles(): ReactNode {
	return CORNERS.map((corner) => (
		<span className="selection-handle" data-corner={corner} key={corner} />
	));
}

export function LayerOutline({
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

	return (
		<span className="selection-padding" style={{ borderWidth: zoomedLengths(outline.padding) }} />
	);
}

export function boxStyle(box: Rect): CSSProperties {
	return {
		transform: `translate3d(${zoomed(box.x)}, ${zoomed(box.y)}, 0)`,
		width: zoomed(box.width),
		height: zoomed(box.height),
	};
}

function SoleOutline({
	doc,
	id,
	user,
}: {
	doc: DesignDocument;
	id: LayerId;
	user: UserState;
}): ReactNode {
	if (useSlot(user.pathEdit) === id) {
		return null;
	}

	return (
		<>
			<LayerOutline className="selection" doc={doc} id={id}>
				<PaddingBand doc={doc} id={id} />
				<CornerHandles />
				<OriginMark doc={doc} id={id} />
			</LayerOutline>
			<SkewMarks doc={doc} id={id} user={user} />
		</>
	);
}

function GroupOutline({
	doc,
	ids,
	user,
}: {
	doc: DesignDocument;
	ids: readonly LayerId[];
	user: UserState;
}): ReactNode {
	const box = useSelectionBox(doc, ids);

	return (
		<>
			{ids.map((id) => (
				<LayerOutline className="selection-peer" doc={doc} id={id} key={id} />
			))}
			{box === null ? null : (
				<div className="selection-box" style={{ ...boxStyle(box), ...HANDLE_STYLE }}>
					<CornerHandles />
					<GroupPivotMark box={box} ids={ids} user={user} />
				</div>
			)}
		</>
	);
}

export function SelectionOutline({
	doc,
	user,
}: {
	doc: DesignDocument;
	user: UserState;
}): ReactNode {
	const ids = useSlot(user.selection);
	const [id, peer] = ids;

	if (id === undefined) {
		return null;
	}
	return peer === undefined ? (
		<SoleOutline doc={doc} id={id} user={user} />
	) : (
		<GroupOutline doc={doc} ids={ids} user={user} />
	);
}
