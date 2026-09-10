import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import { useSelected } from "../state/useSelected";
import type { UserState } from "../state/userState";
import { useChildIds, useLayer, useRootIds } from "../useDocument";
import { isArtboard, layerEntry } from "./layerEntry";

function LayerBranch({
	doc,
	ids,
	user,
}: {
	doc: DesignDocument;
	ids: readonly LayerId[];
	user: UserState;
}): ReactElement {
	return (
		<ul className="layer-list">
			{ids.map((id) => (
				<LayerRow doc={doc} id={id} key={id} user={user} />
			))}
		</ul>
	);
}

function LayerRow({
	doc,
	id,
	user,
}: {
	doc: DesignDocument;
	id: LayerId;
	user: UserState;
}): ReactElement {
	const layer = useLayer(doc, id);
	const childIds = useChildIds(doc, id);
	const selected = useSelected(user.selection, id);
	const glyph = isArtboard(layer) ? "artboard" : "rectangle";

	return (
		<li>
			<button
				aria-pressed={selected}
				className="layer-row"
				onClick={() => {
					user.selection.set([id]);
				}}
				type="button"
			>
				<span className={`layer-glyph layer-glyph-${glyph}`} />
				{layerEntry(layer).label}
			</button>
			{childIds.length === 0 ? null : <LayerBranch doc={doc} ids={childIds} user={user} />}
		</li>
	);
}

export function LayerList({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const ids = useRootIds(doc);

	return (
		<aside className="panel" id="layers">
			<h2 className="panel-title">Layers</h2>
			<LayerBranch doc={doc} ids={ids} user={user} />
		</aside>
	);
}
