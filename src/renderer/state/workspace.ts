import { Slot } from "./slot";
import { Tab } from "./tab";

export class Workspace {
	readonly tabs: Slot<readonly Tab[]>;
	readonly active: Slot<Tab>;

	constructor(first: Tab) {
		this.tabs = new Slot<readonly Tab[]>([first]);
		this.active = new Slot(first);
	}

	add(tab: Tab): void {
		this.tabs.set([...this.tabs.get(), tab]);
		this.active.set(tab);
	}

	close(tab: Tab): void {
		const tabs = this.tabs.get();
		const index = tabs.indexOf(tab);
		if (index === -1) {
			return;
		}
		const rest = tabs.filter((held) => held !== tab);
		const next = rest[Math.min(index, rest.length - 1)] ?? Tab.untitled();
		if (this.active.get() === tab) {
			this.active.set(next);
		}
		this.tabs.set(rest.length === 0 ? [next] : rest);
	}
}
