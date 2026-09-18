import type { ReactElement, ReactNode } from "react";
import type { DisplayMode, Distribute, SizeMode } from "../../../document/layout";

const SIZE_PATH: Readonly<Record<SizeMode, string>> = {
	fixed: "M1.6 2.6v6.8M10.4 2.6v6.8M2.6 6h6.8",
	hug: "M1.6 2.6v6.8M10.4 2.6v6.8M2.8 6h2.2M3.9 4.9 5.1 6 3.9 7.1M9.2 6H7M8.1 4.9 6.9 6l1.2 1.1",
	fill: "M1.6 2.6v6.8M10.4 2.6v6.8M5 6H2.8M4.1 4.9 2.9 6l1.2 1.1M7 6h2.2M7.9 4.9 9.1 6 7.9 7.1",
};

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

export function SizeModeIcon({ mode }: { mode: SizeMode }): ReactElement {
	return (
		<Glyph size={12}>
			<path d={SIZE_PATH[mode]} stroke="currentColor" strokeLinecap="round" strokeWidth="1" />
		</Glyph>
	);
}

export function DisplayIcon({ display }: { display: DisplayMode }): ReactElement {
	return <Glyph size={14}>{DISPLAY_GLYPH[display]}</Glyph>;
}

const SPREAD_AT: Readonly<Record<Distribute, readonly number[]>> = {
	pack: [1.5, 3.5, 5.5],
	between: [1.5, 5, 8.5],
	around: [2, 5, 8],
	evenly: [2.25, 5, 7.75],
};

export function DistributeIcon({ distribute }: { distribute: Distribute }): ReactElement {
	return (
		<Glyph size={12}>
			<rect
				height="11"
				rx="1.5"
				stroke="currentColor"
				strokeOpacity="0.5"
				width="11"
				x="0.5"
				y="0.5"
			/>
			{SPREAD_AT[distribute].map((x) => (
				<rect fill="currentColor" height="2" key={x} rx="0.4" width="2" x={x} y="5" />
			))}
		</Glyph>
	);
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
