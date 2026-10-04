import { assetOf } from "../../document/assets";
import type { DesignDocument } from "../../document/document";
import type { Scope } from "../../document/scope";
import { DOCUMENT_SCOPE, newVariableId, variableOf } from "../../document/variable";
import { optionalText, pathArg, textArg } from "./args";
import type { Args } from "./args";
import type { Handler } from "./layerTools";

function scopeArg(doc: DesignDocument, args: Args): Scope {
	const owner = optionalText(args, "owner") ?? DOCUMENT_SCOPE;
	if (owner !== DOCUMENT_SCOPE && doc.components.entry(owner) === null) {
		throw new TypeError(`No component has the id ${owner}.`);
	}
	return doc.components.ensureScope(owner);
}

function listComponents(doc: DesignDocument): unknown {
	const view = doc.components.view();
	const owners = [DOCUMENT_SCOPE, ...view.entries.map((entry) => entry.id)];
	return {
		components: view.entries,
		variables: Object.fromEntries(owners.map((owner) => [owner, view.variables(owner)])),
	};
}

function initialOf(args: Args): unknown {
	const { initial, type } = args;
	const plain = typeof initial === "number" || typeof initial === "boolean";
	return type === "text" && plain ? String(initial) : initial;
}

function setVariable(doc: DesignDocument, args: Args): unknown {
	const scope = scopeArg(doc, args);
	const id = optionalText(args, "id") ?? newVariableId();
	const initial = initialOf(args);
	const variable = variableOf(id, { ...args, initial });
	if (variable === null) {
		throw new TypeError("Give a name, a type, and options for a choice.");
	}
	if (JSON.stringify(variable.initial) !== JSON.stringify(initial)) {
		throw new TypeError(
			`The initial value ${JSON.stringify(initial)} does not fit the type ${variable.type}.`,
		);
	}
	scope.put(variable);
	return variable;
}

function deleteVariable(doc: DesignDocument, args: Args): unknown {
	const scope = scopeArg(doc, args);
	const id = textArg(args, "id");
	if (!scope.variables().some((variable) => variable.id === id)) {
		throw new TypeError(`No variable has the id ${id}.`);
	}
	scope.remove(id);
	return { deleted: id };
}

function bytesOf(base64: string): Uint8Array<ArrayBuffer> {
	try {
		return Uint8Array.from(atob(base64), (char) => char.codePointAt(0) ?? 0);
	} catch {
		throw new TypeError("Give base64 as base64 text.");
	}
}

async function addAsset(doc: DesignDocument, args: Args): Promise<unknown> {
	const asset = await assetOf(bytesOf(textArg(args, "base64")), textArg(args, "type"));
	if (asset === null) {
		throw new TypeError("botframe does not accept this media type or size.");
	}
	doc.assets.put(asset);
	return { asset: asset.id };
}

export const DATA_TOOLS: Readonly<Record<string, Handler>> = {
	list_components: listComponents,
	set_variable: setVariable,
	delete_variable: deleteVariable,
	read_data: (doc, args) => doc.readData(pathArg(args)),
	write_data: (doc, args) => {
		const path = pathArg(args);
		doc.writeData(path, args["value"]);
		return doc.readData(path);
	},
	delete_data: (doc, args) => {
		doc.deleteData(pathArg(args));
		return { deleted: true };
	},
	add_asset: addAsset,
};
