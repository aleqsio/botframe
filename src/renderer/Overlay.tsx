import type { CSSProperties, ReactNode } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId } from "../document/layer";
import { droppedInto } from "./input/dropHighlight";
import { CORNERS, HANDLE_SIZE } from "./input/handles";
import { useSelected } from "./state/useSelected";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useDrawnFrame } from "./useDocument";
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

export function Overlay({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	return (
		<>
			<Drop doc={doc} user={user} />
			<Highlight doc={doc} user={user} />
			<SelectionFrame doc={doc} user={user} />
		</>
	);
}
