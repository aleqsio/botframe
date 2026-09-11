import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import { useSelected } from "../state/useSelected";
import { usePicked } from "../state/useSlot";
import { toggleCollapsed } from "../state/userState";
import type { UserState } from "../state/userState";
import { useChildIds, useLayer, useRootIds } from "../useDocument";
import { isArtboard, layerEntry } from "./layerEntry";

function LayerChevron({
	collapsed,
	label,
	onPress,
}: {
	collapsed: boolean;
	label: string;
	onPress: () => void;
}): ReactElement {
	return (
		<button
			aria-expanded={!collapsed}
			aria-label={`${collapsed ? "Expand" : "Collapse"} ${label}`}
			className="layer-chevron"
			onClick={onPress}
			type="button"
		/>
	);
}

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
	const collapsed = usePicked(user.collapsed, (ids) => ids.has(id));
	const entry = layerEntry(layer);
	const branch = childIds.length > 0;

	return (
		<li className="layer-item">
			<div className="layer-line">
				{branch ? (
					<LayerChevron
						collapsed={collapsed}
						label={entry.label}
						onPress={() => {
							toggleCollapsed(user.collapsed, id);
						}}
					/>
				) : (
					<span className="layer-chevron" />
				)}
				<button
					aria-pressed={selected}
					className="layer-row"
					onClick={() => {
						user.selection.set([id]);
					}}
					type="button"
				>
					<span
						className={`layer-glyph layer-glyph-${isArtboard(layer) ? "artboard" : "rectangle"}`}
					/>
					{entry.label}
				</button>
			</div>
			{branch && !collapsed ? <LayerBranch doc={doc} ids={childIds} user={user} /> : null}
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
