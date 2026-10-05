import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { readFile } from "../../document/file";
import { UserState } from "../state/userState";
import { ExportView } from "./ExportView";
import { painted } from "./drawScene";
import { fileOf } from "./fileOf";
import { mediaLoaded } from "./media";
import { sceneOf } from "./scene";

export async function renderScene(root: Root, value: unknown): Promise<Uint8Array> {
	const scene = sceneOf(value);
	const doc = readFile(scene.file);
	if (doc === null) {
		throw new Error("The document is not valid.");
	}
	const user = new UserState();
	flushSync(() => {
		root.render(<ExportView doc={doc} user={user} />);
	});
	const stage = document.querySelector<HTMLElement>("#stage");
	if (stage === null) {
		throw new Error("botframe did not draw the document.");
	}
	try {
		await painted();
		await mediaLoaded(stage);
		await painted();
		return await fileOf(doc, { stage, camera: user.camera }, scene);
	} finally {
		flushSync(() => {
			root.render(null);
		});
	}
}
