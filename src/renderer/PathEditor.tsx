import type { CSSProperties, ReactNode } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId } from "../document/layer";
import { editableVertices } from "../document/vertices";
import type { Offset, Vertex } from "../document/vertices";
import { pathData } from "./pathShape";
import { LayerOutline } from "./SelectionOutline";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useDrawnOutline, useLayer } from "./useDocument";

type Side = "before" | "after";

interface Mark {
	key: string;
	vertex: Vertex;
}

const PERCENT = 100;
const SIDES: readonly Side[] = ["before", "after"];

function placeOf(point: Offset): CSSProperties {
	return { left: `${point.x * PERCENT}%`, top: `${point.y * PERCENT}%` };
}

function handlesOf(vertex: Vertex): { side: Side; at: Offset }[] {
	return SIDES.flatMap((side) => {
		const handle = vertex[side];
		return handle.x === 0 && handle.y === 0
			? []
			: [{ side, at: { x: vertex.x + handle.x, y: vertex.y + handle.y } }];
	});
}

function marksOf(vertices: readonly Vertex[]): Mark[] {
	return vertices.map((vertex, place) => ({ key: `vertex-${place}`, vertex }));
}

function VertexMarks({ vertex }: { vertex: Vertex }): ReactNode {
	const handles = handlesOf(vertex);

	return (
		<>
			<svg className="path-lines" preserveAspectRatio="none" viewBox="0 0 1 1">
				{handles.map(({ side, at }) => (
					<line key={side} x1={vertex.x} x2={at.x} y1={vertex.y} y2={at.y} />
				))}
			</svg>
			{handles.map(({ side, at }) => (
				<span className="path-handle" key={side} style={placeOf(at)} />
			))}
			<span className="path-vertex" style={placeOf(vertex)} />
		</>
	);
}

function EditedPath({ doc, id }: { doc: DesignDocument; id: LayerId }): ReactNode {
	const layer = useLayer(doc, id);
	const outline = useDrawnOutline(doc, id);
	const vertices =
		layer === null || outline === null ? null : editableVertices(layer.geometry, outline);

	if (vertices === null) {
		return null;
	}

	return (
		<LayerOutline className="path-edit" doc={doc} id={id}>
			<svg className="path-lines" preserveAspectRatio="none" viewBox="0 0 1 1">
				<path d={pathData(vertices)} />
			</svg>
			{marksOf(vertices).map(({ key, vertex }) => (
				<VertexMarks key={key} vertex={vertex} />
			))}
		</LayerOutline>
	);
}

export function PathEditor({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	const id = useSlot(user.pathEdit);

	return id === null ? null : <EditedPath doc={doc} id={id} />;
}
