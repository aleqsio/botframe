import type { ReactElement, ReactNode } from "react";
import type { DisplayMode } from "../../../document/layout";

const DISPLAY_GLYPH: Readonly<Record<DisplayMode, ReactNode>> = {
	block: (
		<>
			<rect
				height="10.4"
				rx="2"
				stroke="currentColor"
				strokeWidth="1.2"
				width="10.4"
				x="1.8"
				y="1.8"
			/>
			<circle cx="4.5" cy="4.5" fill="currentColor" r="1.3" />
		</>
	),
	row: (
		<>
			<rect fill="currentColor" height="8" rx="1" width="3" x="1" y="3" />
			<rect fill="currentColor" height="8" rx="1" width="3" x="5.5" y="3" />
			<rect fill="currentColor" height="8" rx="1" width="3" x="10" y="3" />
		</>
	),
	column: (
		<>
			<rect fill="currentColor" height="3" rx="1" width="8" x="3" y="1" />
			<rect fill="currentColor" height="3" rx="1" width="8" x="3" y="5.5" />
			<rect fill="currentColor" height="3" rx="1" width="8" x="3" y="10" />
		</>
	),
	grid: (
		<>
			<rect fill="currentColor" height="5.2" rx="1" width="5.2" x="1" y="1" />
			<rect fill="currentColor" height="5.2" rx="1" width="5.2" x="7.8" y="1" />
			<rect fill="currentColor" height="5.2" rx="1" width="5.2" x="1" y="7.8" />
			<rect fill="currentColor" height="5.2" rx="1" width="5.2" x="7.8" y="7.8" />
		</>
	),
};

function Glyph({ children, size }: { children: ReactNode; size: number }): ReactElement {
	return (
		<svg
			aria-hidden="true"
			className="layout-glyph"
			fill="none"
			focusable="false"
			viewBox={`0 0 ${size} ${size}`}
		>
			{children}
		</svg>
	);
}

export function DisplayIcon({ display }: { display: DisplayMode }): ReactElement {
	return <Glyph size={14}>{DISPLAY_GLYPH[display]}</Glyph>;
}

export function WrapIcon(): ReactElement {
	return (
		<Glyph size={14}>
			<rect fill="currentColor" height="3.6" rx="1" width="5.2" x="1" y="2" />
			<rect fill="currentColor" height="3.6" rx="1" width="5.2" x="7.4" y="2" />
			<rect fill="currentColor" height="3.6" rx="1" width="5.2" x="1" y="8.2" />
			<path
				d="M9 9.4h2.6M10.3 8.3 11.6 9.4l-1.3 1.1"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="1.1"
			/>
		</Glyph>
	);
}

export function PaddingIcon(): ReactElement {
	return (
		<Glyph size={12}>
			<rect
				height="10.4"
				rx="1.6"
				stroke="currentColor"
				strokeDasharray="2.2 1.8"
				strokeWidth="1.1"
				width="10.4"
				x="0.8"
				y="0.8"
			/>
			<rect fill="currentColor" height="4.8" rx="1" width="4.8" x="3.6" y="3.6" />
		</Glyph>
	);
}

export function SidesIcon(): ReactElement {
	return (
		<Glyph size={14}>
			<rect
				height="11.2"
				rx="2"
				stroke="currentColor"
				strokeWidth="1.1"
				width="11.2"
				x="1.4"
				y="1.4"
			/>
			<path
				d="M7 1.4v11.2M1.4 7h11.2"
				stroke="currentColor"
				strokeDasharray="1.8 1.6"
				strokeWidth="1.1"
			/>
		</Glyph>
	);
}
