import type { LayerId } from "../../document/layer";
import type { Slot } from "./slot";
import { usePicked } from "./useSlot";

export function isSelected(selection: readonly LayerId[], id: LayerId): boolean {
	return selection.includes(id);
}

export function useSelected(selection: Slot<readonly LayerId[]>, id: LayerId): boolean {
	return usePicked(selection, (ids) => isSelected(ids, id));
}
