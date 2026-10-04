import { useRef } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import { rowMarkOf } from "../input/rowDrop";
import { useRowDrag } from "../input/useRowDrag";
import type { RowHandlers } from "../input/useRowDrag";
import { useSelected } from "../state/useSelected";
import { usePicked } from "../state/useSlot";
import { toggleCollapsed } from "../state/userState";
import type { UserState } from "../state/userState";
import {
	useChildIds,
	useClipTargets,
	useComponentsView,
	useLayer,
	useLayers,
	useRootIds,
} from "../useDocument";
import { glyphOf, isCode, layerEntry } from "./layerEntry";

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

interface BranchProps {
	doc: DesignDocument;
	ids: readonly LayerId[];
	rows: RowHandlers;
	user: UserState;
}

function LayerBranch({ doc, ids, rows, user }: BranchProps): ReactElement {
	return (
		<ul className="layer-list">
			{ids.map((id) => (
				<LayerRow doc={doc} id={id} key={id} rows={rows} user={user} />
			))}
		</ul>
	);
}

function LayerRow({
	doc,
	id,
	rows,
	user,
}: Omit<BranchProps, "ids"> & { id: LayerId }): ReactElement {
	const layer = useLayer(doc, id);
	const code = isCode(layer, useComponentsView(doc));
	const childIds = useChildIds(doc, id);
	const selected = useSelected(user.selection, id);
	const collapsed = usePicked(user.collapsed, (ids) => ids.has(id));
	const mark = usePicked(user.rowDrag, (drag) => rowMarkOf(drag, id));
	const entry = layerEntry(layer);
	const clips = useLayers(doc, useClipTargets(doc, id))
		.map((target) => layerEntry(target).label)
		.join(", ");
	const branch = childIds.length > 0;

	return (
		<li className="layer-item">
			<div className="layer-line" data-mark={mark ?? undefined} data-row-id={id}>
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
					data-source={clips === "" ? undefined : ""}
					onClick={(event) => {
						rows.onClick(event, id);
					}}
					onContextMenu={(event) => {
						rows.onContextMenu(event, id);
					}}
					onPointerCancel={rows.onPointerCancel}
					onPointerDown={(event) => {
						rows.onPointerDown(event, id);
					}}
					onPointerMove={rows.onPointerMove}
					onPointerUp={rows.onPointerUp}
					type="button"
				>
					<span className={`layer-glyph layer-glyph-${glyphOf(layer, code)}`} />
					{entry.label}
					{clips === "" ? null : <span className="layer-meta">clips {clips}</span>}
				</button>
			</div>
			{branch && !collapsed ? (
				<LayerBranch doc={doc} ids={childIds} rows={rows} user={user} />
			) : null}
		</li>
	);
}

export function LayerList({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const ids = useRootIds(doc);
	const panel = useRef<HTMLElement>(null);
	const rows = useRowDrag(doc, user, panel);

	return (
		<aside aria-label="Layers" id="layers" ref={panel}>
			<LayerBranch doc={doc} ids={ids} rows={rows} user={user} />
		</aside>
	);
}
