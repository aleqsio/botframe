import type { ReactElement, ReactNode } from "react";

export function ChangedMark({
	changed,
	children,
}: {
	changed: boolean;
	children: ReactNode;
}): ReactElement {
	return (
		<div className="changed-mark" data-changed={changed ? "" : undefined}>
			{children}
		</div>
	);
}
