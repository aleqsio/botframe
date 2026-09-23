import type { ReactElement, ReactNode } from "react";

export function ChipSection({
	name,
	marksOrigin,
	children,
}: {
	name: string;
	marksOrigin: boolean;
	children: ReactNode;
}): ReactElement {
	return (
		<div className="field-group layout-section" data-marks-origin={marksOrigin || undefined}>
			<span className="group-label">{name}</span>
			<div className="chip-row">{children}</div>
		</div>
	);
}
