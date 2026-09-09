import { Toolbar } from "@base-ui-components/react/toolbar";
import type { ReactElement, ReactNode } from "react";

export function FloatingBar({
	children,
	label,
}: {
	children: ReactNode;
	label: string;
}): ReactElement {
	return (
		<Toolbar.Root aria-label={label} className="floating-bar">
			{children}
		</Toolbar.Root>
	);
}
