import type { ReactElement } from "react";

interface LayerItem {
	id: string;
	name: string;
	kind: "artboard" | "rectangle";
	depth: number;
}

const ITEMS: readonly LayerItem[] = [
	{ id: "a1", name: "Artboard", kind: "artboard", depth: 0 },
	{ id: "r1", name: "Rectangle", kind: "rectangle", depth: 1 },
];

const SELECTED = "r1";

export function LayerList(): ReactElement {
	return (
		<aside className="panel" id="layers">
			<h2 className="panel-title">Layers</h2>
			<ul className="layer-list">
				{ITEMS.map((item) => (
					<li key={item.id}>
						<button
							aria-pressed={item.id === SELECTED}
							className="layer-row"
							style={{ paddingLeft: `${8 + item.depth * 14}px` }}
							type="button"
						>
							<span className={`layer-glyph layer-glyph-${item.kind}`} />
							{item.name}
						</button>
					</li>
				))}
			</ul>
		</aside>
	);
}
