import type { ReactNode } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId } from "../document/layer";
import { SnapLines } from "./CanvasMarks";
import { LayerOutline, SelectionOutline, boxStyle } from "./SelectionOutline";
import { droppedInto } from "./input/dropHighlight";
import { PathEditor } from "./PathEditor";
import { SelectedShapes, ShapeLineOf } from "./ShapeOutlines";
import { ownLineShown } from "./shapeLines";
import { useSelected } from "./state/useSelected";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useLayer } from "./useDocument";

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
	const layer = useLayer(doc, id);

	if (useSelected(user.selection, id)) {
		return null;
	}

	return (
		<>
			<LayerOutline className="highlight" doc={doc} id={id} />
			{layer !== null && ownLineShown(layer) ? (
				<ShapeLineOf className="shape-line shape-line-hover" doc={doc} id={id} />
			) : null}
		</>
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
			<SelectedShapes doc={doc} user={user} />
			<PathEditor doc={doc} user={user} />
			<Marquee user={user} />
			<SnapLines doc={doc} user={user} />
		</>
	);
}
