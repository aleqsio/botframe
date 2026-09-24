import type { CSSProperties, ReactElement } from "react";
import type { Guide } from "../document/guides";
import { SCREEN_BOX, zoomed } from "./screenSpace";

function guideStyle(guide: Guide): CSSProperties {
	return guide.axis === "x" ? { left: zoomed(guide.at) } : { top: zoomed(guide.at) };
}

export function GuideLines({ guides }: { guides: readonly Guide[] }): ReactElement | null {
	if (guides.length === 0) {
		return null;
	}

	return (
		<div className="guide-space" style={SCREEN_BOX}>
			{Array.from(guides.entries(), ([index, guide]) => (
				<span className="guide-line" data-axis={guide.axis} key={index} style={guideStyle(guide)} />
			))}
		</div>
	);
}
