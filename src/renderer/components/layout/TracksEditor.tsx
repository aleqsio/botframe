import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactElement, RefObject } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { TrackChips } from "./TrackChips";
import { TrackBar } from "./TrackBar";
import { TrackStencil } from "./TrackStencil";
import { MAX_TRACKS, TRACK_WORD, addTrack, factorTemplate, trackList, writeTracks } from "./tracks";
import type { TrackAxis, TrackEdit } from "./tracks";

type PadRef = RefObject<HTMLDivElement | null>;

function listenForDismiss(root: PadRef, onDismiss: () => void): () => void {
	const onDown = (event: PointerEvent): void => {
		const { target } = event;
		if (!(target instanceof Element)) {
			return;
		}
		if (root.current?.contains(target) !== true && target.closest(".unit-menu") === null) {
			onDismiss();
		}
	};
	const onKey = (event: KeyboardEvent): void => {
		if (event.key === "Enter" || event.key === "Escape") {
			onDismiss();
		}
	};
	document.addEventListener("pointerdown", onDown);
	document.addEventListener("keydown", onKey);
	return () => {
		document.removeEventListener("pointerdown", onDown);
		document.removeEventListener("keydown", onKey);
	};
}

function useDismiss(root: PadRef, open: boolean, onDismiss: () => void): void {
	useEffect(() => (open ? listenForDismiss(root, onDismiss) : undefined), [onDismiss, open, root]);
}

function ColumnBracket({
	index,
	template,
}: {
	index: number | null;
	template: CSSProperties;
}): ReactElement {
	return (
		<div className="layout-brackets" style={template}>
			{index === null ? null : (
				<span className="layout-bracket" style={{ gridColumn: index + 1 }} />
			)}
		</div>
	);
}

function GhostTrack({
	axis,
	count,
	onAdd,
}: {
	axis: TrackAxis;
	count: number;
	onAdd: () => void;
}): ReactElement {
	const tip = `Add ${TRACK_WORD[axis].toLowerCase()}`;

	return (
		<button
			aria-label={tip}
			className={`layout-ghost layout-ghost-${axis}`}
			disabled={count >= MAX_TRACKS}
			onClick={onAdd}
			title={tip}
			type="button"
		>
			+
		</button>
	);
}

export function TracksEditor({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const [edit, setEdit] = useState<TrackEdit | null>(null);
	const root = useRef<HTMLDivElement | null>(null);
	const { tracks } = layer.layout;
	const close = (): void => {
		setEdit(null);
	};
	useDismiss(root, edit !== null, close);

	const openOn =
		(axis: TrackAxis) =>
		(index: number): void => {
			setEdit({ axis, index });
		};
	const addOn = (axis: TrackAxis) => (): void => {
		writeTracks(doc, layer, axis, addTrack(trackList(tracks, axis)));
	};
	const columns = { gridTemplateColumns: factorTemplate(tracks.columns) };
	const rows = { gridTemplateRows: factorTemplate(tracks.rows) };
	const onColumn = edit?.axis === "columns" ? edit.index : null;
	const bar =
		edit === null ? null : <TrackBar doc={doc} edit={edit} layer={layer} onClose={close} />;

	return (
		<>
			<span className="layout-sub">Tracks</span>
			<div className="layout-tracks" ref={root}>
				{onColumn === null ? (
					<TrackChips
						axis="columns"
						onOpen={openOn("columns")}
						open={null}
						template={columns}
						tracks={tracks.columns}
					/>
				) : (
					<div className="layout-tbar-slot">{bar}</div>
				)}
				<ColumnBracket index={onColumn} template={columns} />
				<TrackChips
					axis="rows"
					onOpen={openOn("rows")}
					open={edit?.axis === "rows" ? edit.index : null}
					template={rows}
					tracks={tracks.rows}
				/>
				<TrackStencil
					bar={bar}
					columns={tracks.columns}
					edit={edit}
					onOpen={openOn("columns")}
					rows={tracks.rows}
					template={{ ...columns, ...rows }}
				/>
				<GhostTrack axis="columns" count={tracks.columns.length} onAdd={addOn("columns")} />
				<GhostTrack axis="rows" count={tracks.rows.length} onAdd={addOn("rows")} />
			</div>
		</>
	);
}
