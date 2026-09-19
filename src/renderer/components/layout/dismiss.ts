export interface Zone {
	contains(node: Zone | null): boolean;
}

export interface DismissPlan {
	blur: boolean;
	dismiss: boolean;
}

export interface PointerAt {
	active: Zone | null;
	inMenu: boolean;
	root: Zone | null;
	target: Zone;
}

export function dismissPlan({ active, inMenu, root, target }: PointerAt): DismissPlan {
	if (inMenu || root === null || root.contains(target)) {
		return { blur: false, dismiss: false };
	}
	return { blur: active !== null && root.contains(active), dismiss: true };
}
