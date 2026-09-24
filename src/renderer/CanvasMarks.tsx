import type { CSSProperties, ReactNode } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId, Rect } from "../document/layer";
import { groupPivotOf } from "./input/pivot";
import type { SnapSegment } from "./input/snap";
import { originPlace } from "./layerStyle";
import { useSlot } from "./state/useSlot";
import type { Slot } from "./state/slot";
import type { GroupPivot, UserState } from "./state/userState";
import { useDrawnSpace, useLayer } from "./useDocument";

export function OriginMark({ doc, id }: { doc: DesignDocument; id: LayerId }): ReactNode {
	const layer = useLayer(doc, id);

	if (layer === null) {
		return null;
	}

	return <span className="origin-mark" style={originPlace(layer.origin)} />;
}

export function GroupPivotMark({
	box,
	ids,
	pivot,
}: {
	box: Rect;
	ids: readonly LayerId[];
	pivot: Slot<GroupPivot | null>;
}): ReactNode {
	const point = groupPivotOf(useSlot(pivot), ids, box);

	return (
		<span
			className="origin-mark"
			style={{ left: `${point.x - box.x}px`, top: `${point.y - box.y}px` }}
		/>
	);
}

function snapLineStyle(segment: SnapSegment): CSSProperties {
	const along = `${segment.to - segment.from}px`;
	if (segment.axis === "x") {
		return { transform: `translate3d(${segment.at}px, ${segment.from}px, 0)`, height: along };
	}
	return { transform: `translate3d(${segment.from}px, ${segment.at}px, 0)`, width: along };
}

export function SnapLines({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
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
