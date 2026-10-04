const DATABASE = "botframe";
const STORE = "session";
const KEY = "workspace";

export interface StoredTab {
	name: string;
	token: string | null;
	savedVersion: string;
	bytes: Uint8Array;
}

export interface StoredSession {
	tabs: readonly StoredTab[];
	active: number;
}

function fieldsOf<T>(value: unknown): Partial<Record<keyof T, unknown>> | null {
	return typeof value === "object" && value !== null ? value : null;
}

function storedTab(value: unknown): StoredTab | null {
	const tab = fieldsOf<StoredTab>(value);
	const { bytes, name, savedVersion, token } = tab ?? {};
	const valid =
		typeof name === "string" &&
		typeof savedVersion === "string" &&
		(token === null || typeof token === "string") &&
		bytes instanceof Uint8Array;
	return valid ? { name, token, savedVersion, bytes } : null;
}

function storedSession(value: unknown): StoredSession | null {
	const session = fieldsOf<StoredSession>(value);
	if (!Array.isArray(session?.tabs) || typeof session.active !== "number") {
		return null;
	}
	const tabs = session.tabs.flatMap((tab: unknown) => storedTab(tab) ?? []);
	return { tabs, active: session.active };
}

function settled<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.addEventListener("success", () => {
			resolve(request.result);
		});
		request.addEventListener("error", () => {
			reject(request.error ?? new Error(STORE));
		});
	});
}

let database: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
	const opening = indexedDB.open(DATABASE, 1);
	opening.addEventListener("upgradeneeded", () => {
		opening.result.createObjectStore(STORE);
	});
	return settled(opening);
}

async function storeOf(mode: IDBTransactionMode): Promise<IDBObjectStore> {
	database ??= openDatabase();
	return (await database).transaction(STORE, mode).objectStore(STORE);
}

export async function readSession(): Promise<StoredSession | null> {
	try {
		const value: unknown = await settled((await storeOf("readonly")).get(KEY));
		return storedSession(value);
	} catch {
		return null;
	}
}

export async function writeSession(session: StoredSession): Promise<void> {
	await settled((await storeOf("readwrite")).put(session, KEY));
}
