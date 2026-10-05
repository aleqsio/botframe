import type { ReactElement, Ref } from "react";
import { ACCEPTED_TYPES } from "../../../document/assets";

export function MediaFileInput({
	onFile,
	ref,
}: {
	onFile: (file: File) => void;
	ref: Ref<HTMLInputElement>;
}): ReactElement {
	return (
		<input
			accept={ACCEPTED_TYPES}
			aria-label="Media file"
			hidden
			onChange={(event) => {
				const [file] = event.target.files ?? [];
				event.target.value = "";
				if (file !== undefined) {
					onFile(file);
				}
			}}
			ref={ref}
			type="file"
		/>
	);
}
