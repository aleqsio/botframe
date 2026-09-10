import type { ReactElement } from "react";
import { BORDER_WIDTHS } from "../state/appearance";

export function WidthField({
	onPick,
	value,
}: {
	onPick: (next: number) => void;
	value: number;
}): ReactElement {
	return (
		<div className="appearance-row">
			<span className="appearance-label">Border</span>
			<div className="appearance-widths">
				{BORDER_WIDTHS.map((width) => (
					<button
						aria-pressed={width === value}
						className="appearance-width"
						data-width={width}
						key={width}
						onClick={() => {
							onPick(width);
						}}
						type="button"
					>
						{width}
					</button>
				))}
			</div>
		</div>
	);
}
