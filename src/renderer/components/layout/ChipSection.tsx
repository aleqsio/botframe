import type { ReactElement, ReactNode } from "react";

export function ChipSection({
	name,
	children,
}: {
	name: string;
	children: ReactNode;
}): ReactElement {
	return (
		<div className="field-group layout-section">
			<span className="group-label">{name}</span>
			<div className="chip-row">{children}</div>
		</div>
	);
}
