import type { ReactElement } from "react";
import { ChipBox } from "./layout/ChipBox";
import { ChipGrip } from "./layout/ChipGrip";
import type { ChipGripProps } from "./layout/ChipGrip";

export function NumberChip(props: ChipGripProps): ReactElement {
	return (
		<ChipBox {...props}>
			<ChipGrip {...props} />
		</ChipBox>
	);
}
