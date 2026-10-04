import { bagOf } from "../../document/bag";
import type { DataPath } from "../../document/dataPath";
import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import { isLayerId } from "../../document/path";

export type Args = Readonly<Record<string, unknown>>;

export function argsOf(value: unknown): Args {
	return Array.isArray(value) ? {} : bagOf(value);
}

export function textArg(args: Args, key: string): string {
	const value = args[key];
	if (typeof value !== "string" || value === "") {
		throw new TypeError(`Give ${key} as a string.`);
	}
	return value;
}

export function optionalText(args: Args, key: string): string | null {
	return args[key] === undefined ? null : textArg(args, key);
}

export function indexArg(args: Args): number | undefined {
	const { index } = args;
	if (index === undefined) {
		return undefined;
	}
	if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {
		throw new TypeError("Give index as an integer that is 0 or more.");
	}
	return index;
}

export function layerArg(doc: DesignDocument, value: unknown): LayerId {
	if (typeof value !== "string" || !isLayerId(value) || doc.layer(value) === null) {
		throw new TypeError(`No layer has the id ${JSON.stringify(value)}.`);
	}
	return value;
}

export function parentArg(doc: DesignDocument, args: Args): LayerId | null {
	return args["parent"] === null ? null : layerArg(doc, args["parent"]);
}

export function listArg(args: Args, key: string): readonly unknown[] {
	const value = args[key];
	if (!Array.isArray(value)) {
		throw new TypeError(`Give ${key} as an array.`);
	}
	return value;
}

function isSegment(value: unknown): value is string | number {
	return typeof value === "string" || (typeof value === "number" && Number.isInteger(value));
}

export function pathArg(args: Args): DataPath {
	const path = listArg(args, "path");
	if (!path.every((segment) => isSegment(segment))) {
		throw new TypeError("Give each key of the path as a string or an integer.");
	}
	return path.filter((segment) => isSegment(segment));
}
