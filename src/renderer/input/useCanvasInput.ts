import type { DesignDocument } from "../../document/document";
import type { UserState } from "../state/userState";
import { useKeyInput } from "./useKeyInput";
import { useStageInput } from "./useStageInput";
import type { StagePointerHandlers } from "./useStageInput";
import { useToolInput } from "./useToolInput";

export function useCanvasInput(doc: DesignDocument, user: UserState): StagePointerHandlers {
	useKeyInput(doc, user);
	return useStageInput(user, useToolInput(doc, user));
}
