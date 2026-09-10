import { useCallback, useSyncExternalStore } from "react";
import type { LayerId } from "../../document/layer";
import type { Slot } from "./slot";

export function isSelected(selection: readonly LayerId[], id: LayerId): boolean {
	return selection.includes(id);
}

export function useSelected(selection: Slot<readonly LayerId[]>, id: LayerId): boolean {
	return useSyncExternalStore(
		useCallback((listener: () => void) => selection.subscribe(listener), [selection]),
		useCallback(() => isSelected(selection.get(), id), [selection, id]),
	);
}
