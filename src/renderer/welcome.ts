/// <reference types="vite/client" />
import { readFile } from "../document/file";
import { WELCOME } from "../shared/file";
import { dataUrlBytes } from "./dataUrl";
import { Tab } from "./state/tab";

const NO_WELCOME = "The welcome document did not open.";

export async function welcomeTab(): Promise<Tab> {
	const { default: url } = await import("../../assets/welcome.botframe?inline");
	const doc = readFile(dataUrlBytes(url));
	if (doc === null) {
		throw new Error("The welcome document is not a botframe document.");
	}
	const tab = new Tab(doc, null);
	tab.name.set(WELCOME);
	return tab;
}

export async function welcomeOrAlert(): Promise<Tab | null> {
	try {
		return await welcomeTab();
	} catch (error) {
		window.alert(`${NO_WELCOME} ${String(error)}`);
		return null;
	}
}
