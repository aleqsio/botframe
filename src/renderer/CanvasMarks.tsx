import type { CSSProperties, ReactNode } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId, Rect } from "../document/layer";
import { groupPivotOf } from "./input/pivot";
import type { SnapSegment } from "./input/snap";
import { originPlace } from "./layerStyle";
import { unscaled, zoomed } from "./screenSpace";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
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
	user,
}: {
	box: Rect;
	ids: readonly LayerId[];
	user: UserState;
}): ReactNode {
	const point = groupPivotOf(useSlot(user.groupPivot), ids, box);

	return (
		<span
			className="origin-mark"
			style={{ left: zoomed(point.x - box.x), top: zoomed(point.y - box.y) }}
		/>
	);
}

function snapLineStyle(segment: SnapSegment): CSSProperties {
	const along = zoomed(segment.to - segment.from);
	const at = zoomed(segment.at);
	const from = zoomed(segment.from);
	if (segment.axis === "x") {
		return { transform: `translate3d(${at}, ${from}, 0)`, height: along };
	}
	return { transform: `translate3d(${from}, ${at}, 0)`, width: along };
}

export function SnapLines({ doc, user }: { doc: DesignDocument; user: UserState }): ReactNode {
	const snap = useSlot(user.snap);
	const space = useDrawnSpace(doc, snap?.parent ?? null);

	return snap === null ? null : (
		<div className="snap-space" style={{ transform: unscaled(space) }}>
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
