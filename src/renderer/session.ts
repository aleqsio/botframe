import { fileBytes, readFile } from "../document/file";
import type { StoredSession, StoredTab } from "./sessionStore";
import { readSession, writeSession } from "./sessionStore";
import { Tab } from "./state/tab";
import type { Workspace } from "./state/workspace";
import { welcomeTab } from "./welcome";

const WRITE_DELAY_MS = 400;

interface Exported {
	version: string;
	bytes: Uint8Array;
}

const exported = new WeakMap<Tab, Exported>();

function bytesOf(tab: Tab): Uint8Array {
	const version = tab.doc.version();
	const held = exported.get(tab);
	if (held?.version === version) {
		return held.bytes;
	}
	const bytes = fileBytes(tab.doc);
	exported.set(tab, { version, bytes });
	return bytes;
}

function storedOf(tab: Tab): StoredTab {
	return {
		name: tab.name.get(),
		token: tab.token.get(),
		savedVersion: tab.savedVersion.get(),
		bytes: bytesOf(tab),
	};
}

function tabOf(stored: StoredTab): Tab | null {
	const doc = readFile(stored.bytes);
	if (doc === null) {
		return null;
	}
	const file = stored.token === null ? null : { token: stored.token, name: stored.name };
	const tab = new Tab(doc, file, stored.savedVersion);
	tab.name.set(stored.name);
	return tab;
}

function isBusy(tab: Tab): boolean {
	const { user } = tab;
	return user.dragging.get() || user.draw.get() !== null || user.rowDrag.get() !== null;
}

function isUntouched(workspace: Workspace): boolean {
	const [only, ...rest] = workspace.tabs.get();
	return only !== undefined && rest.length === 0 && only.token.get() === null && !only.hasChanges();
}

function restore(workspace: Workspace, session: StoredSession): void {
	const [first, ...rest] = session.tabs.flatMap((stored) => tabOf(stored) ?? []);
	if (first === undefined || !isUntouched(workspace)) {
		return;
	}
	const tabs = [first, ...rest] as const;
	workspace.replace(tabs, tabs[session.active] ?? first);
}

async function welcome(workspace: Workspace): Promise<void> {
	const tab = await welcomeTab().catch(() => null);
	if (tab !== null && isUntouched(workspace)) {
		workspace.replace([tab], tab);
	}
}

function sessionOf(workspace: Workspace): StoredSession {
	const tabs = workspace.tabs.get();
	return { tabs: tabs.map((tab) => storedOf(tab)), active: tabs.indexOf(workspace.active.get()) };
}

function writer(workspace: Workspace): () => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const flush = (): void => {
		clearTimeout(timer);
		void writeSession(sessionOf(workspace));
	};
	const write = (): void => {
		if (workspace.tabs.get().some((tab) => isBusy(tab))) {
			timer = setTimeout(write, WRITE_DELAY_MS);
			return;
		}
		flush();
	};
	window.addEventListener("pagehide", flush);
	return () => {
		clearTimeout(timer);
		timer = setTimeout(write, WRITE_DELAY_MS);
	};
}

function watchTabs(workspace: Workspace, schedule: () => void): void {
	let drops: (() => void)[] = [];
	const follow = (): void => {
		for (const drop of drops) {
			drop();
		}
		drops = workspace.tabs
			.get()
			.flatMap((tab) => [
				tab.doc.subscribeChanges(schedule),
				tab.name.subscribe(schedule),
				tab.token.subscribe(schedule),
				tab.savedVersion.subscribe(schedule),
			]);
		schedule();
	};
	workspace.tabs.subscribe(follow);
	workspace.active.subscribe(schedule);
	follow();
}

export async function keepSession(workspace: Workspace): Promise<void> {
	const session = await readSession();
	if (session === null) {
		await welcome(workspace);
	} else {
		restore(workspace, session);
	}
	watchTabs(workspace, writer(workspace));
}
