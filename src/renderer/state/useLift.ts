import type { LayerId } from "../../document/layer";
import type { Slot } from "./slot";
import { usePicked } from "./useSlot";
import type { Lifted } from "./userState";

export const NOT_LIFTED = "";

function liftTransform(lift: Lifted | null, id: LayerId): string {
	return lift === null || lift.id !== id
		? NOT_LIFTED
		: `translate3d(${lift.at.x}px, ${lift.at.y}px, 0)`;
}

export function useLift(lift: Slot<Lifted | null>, id: LayerId): string {
	return usePicked(lift, (held) => liftTransform(held, id));
}
