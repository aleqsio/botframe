import type { TreeDiffItem } from "loro-crdt";
import type { Layer, LayerId, LayerTraits } from "./layer";
import { placeChildren, samePlacement } from "./layout";
import type { Placement } from "./layout";

export interface LayoutSource {
	layer: (id: LayerId) => Layer | null;
	childIds: (parent: LayerId) => readonly LayerId[];
	traitsOf: (id: LayerId, parent: LayerId) => LayerTraits | null;
	invalidate: (id: LayerId) => void;
}

function parentsOf(item: TreeDiffItem): readonly (LayerId | undefined)[] {
	if (item.action === "delete") {
		return [item.oldParent];
	}
	return item.action === "move" ? [item.parent, item.oldParent] : [item.parent];
}

export class LayoutTable {
	readonly #placements = new Map<LayerId, ReadonlyMap<LayerId, Placement>>();
	readonly #source: LayoutSource;

	constructor(source: LayoutSource) {
		this.#source = source;
	}

	placementOf(parent: LayerId | null, id: LayerId): Placement | undefined {
		const container = parent === null ? null : this.#source.layer(parent);
		if (container === null || container.layout.kind === "free") {
			return undefined;
		}
		return (this.#placements.get(container.id) ?? this.#compute(container)).get(id);
	}

	refresh(container: LayerId | null): void {
		if (container === null) {
			return;
		}
		const held = this.#placements.get(container);
		const layer = this.#source.layer(container);
		if (layer === null || layer.layout.kind === "free") {
			if (this.#placements.delete(container)) {
				this.#invalidateChildren(container);
			}
			return;
		}
		if (held === undefined) {
			this.#invalidateChildren(container);
			return;
		}
		const next = this.#compute(layer);
		for (const child of this.#source.childIds(container)) {
			if (!samePlacement(held.get(child), next.get(child))) {
				this.#source.invalidate(child);
			}
		}
	}

	refreshAround(items: readonly TreeDiffItem[]): void {
		for (const item of items) {
			for (const parent of parentsOf(item)) {
				this.refresh(parent ?? null);
			}
		}
	}

	clear(): void {
		this.#placements.clear();
	}

	#compute(container: Layer): ReadonlyMap<LayerId, Placement> {
		const children = this.#source.childIds(container.id).flatMap((id) => {
			const traits = this.#source.traitsOf(id, container.id);
			return traits === null
				? []
				: [{ id, width: traits.width, height: traits.height, cell: traits.cell }];
		});
		const placements = placeChildren(container, container.layout, children);
		this.#placements.set(container.id, placements);
		return placements;
	}

	#invalidateChildren(container: LayerId): void {
		for (const child of this.#source.childIds(container)) {
			this.#source.invalidate(child);
		}
	}
}
