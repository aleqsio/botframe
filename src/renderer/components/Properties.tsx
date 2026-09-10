import type { ReactElement } from "react";
import type { Appearance } from "../state/appearance";
import type { Slot } from "../state/slot";
import { AppearancePanel } from "./AppearancePanel";

const FIELDS: readonly (readonly [string, string])[] = [
	["X", "420"],
	["Y", "260"],
	["W", "240"],
	["H", "160"],
];

export function Properties({ appearance }: { appearance: Slot<Appearance> }): ReactElement {
	return (
		<aside className="panel" id="properties">
			<h2 className="panel-title">Rectangle</h2>
			<dl className="property-grid">
				{FIELDS.map(([label, value]) => (
					<div className="property-field" key={label}>
						<dt>{label}</dt>
						<dd>{value}</dd>
					</div>
				))}
			</dl>
			<button className="panel-action" type="button">
				Add fill
			</button>
			<h2 className="panel-title">Appearance</h2>
			<AppearancePanel appearance={appearance} />
		</aside>
	);
}
