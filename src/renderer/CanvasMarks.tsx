import type { CSSProperties, ReactNode } from "react";
import type { DesignDocument } from "../document/document";
import { isCenterOrigin } from "../document/layer";
import type { LayerId } from "../document/layer";
import type { SnapSegment } from "./input/snap";
import { originPlace } from "./layerStyle";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useDrawnSpace, useLayer } from "./useDocument";

export function OriginMark({ doc, id }: { doc: DesignDocument; id: LayerId }): ReactNode {
	const layer = useLayer(doc, id);

	if (layer === null) {
		return null;
	}

	const { origin } = layer;
	return (
		<span
			className="origin-mark"
			data-off-center={!isCenterOrigin(origin) || undefined}
			style={originPlace(origin)}
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
