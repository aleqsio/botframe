import { useCallback, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId } from "../document/layer";
import { HANDLE_SIZE } from "./input/handles";
import { degreesOf } from "../document/linear";
import { SKEW_OFFSET, skewMarksOf } from "./input/skewHandle";
import type { SkewMark } from "./input/skewHandle";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { drawnChain, subscribeAfterCommit } from "./useDocument";

declare module "react" {
	interface CSSProperties {
		"--skew-offset"?: string | undefined;
	}
}

const MARK_PART = "|";
const MARK_STYLE = {
	"--handle-size": `${HANDLE_SIZE}px`,
	"--skew-offset": `${SKEW_OFFSET}px`,
};

function shifted(canvas: number, outward: number): string {
	return `calc(${canvas}px * var(--zoom) + ${outward * SKEW_OFFSET}px)`;
}

function markTransform({ at, outward }: SkewMark): string {
	const turn = degreesOf(Math.atan2(outward.x, -outward.y));
	const place = `translate3d(${shifted(at.x, outward.x)}, ${shifted(at.y, outward.y)}, 0)`;
	return `${place} rotate(${turn}deg)`;
}

const EDGE_PART = " ";

function marksText(doc: DesignDocument, id: LayerId, zoom: number): string {
	return skewMarksOf(drawnChain(doc, id), zoom)
		.map((mark) => `${mark.edge}${EDGE_PART}${markTransform(mark)}`)
		.join(MARK_PART);
}

function markSpan(text: string): ReactNode {
	const [edge = "", ...rest] = text.split(EDGE_PART);
	return (
		<span
			className="skew-mark"
			key={edge}
			style={{ ...MARK_STYLE, transform: rest.join(EDGE_PART) }}
		/>
	);
}

interface MarksProps {
	doc: DesignDocument;
	id: LayerId;
	user: UserState;
}

export function SkewMarks({ doc, id, user }: MarksProps): ReactNode {
	const { zoom } = useSlot(user.camera);
	const text = useSyncExternalStore(
		useCallback((listener: () => void) => subscribeAfterCommit(doc, listener), [doc]),
		useCallback(() => marksText(doc, id, zoom), [doc, id, zoom]),
	);

	return text
		.split(MARK_PART)
		.filter((part) => part !== "")
		.map((part) => markSpan(part));
}
