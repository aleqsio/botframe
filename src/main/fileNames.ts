export function uniqueNames(names: readonly string[]): readonly string[] {
	const taken = new Set<string>();
	return names.map((name) => {
		let unique = name;
		for (let count = 2; taken.has(unique.toLowerCase()); count += 1) {
			unique = `${name} ${count}`;
		}
		taken.add(unique.toLowerCase());
		return unique;
	});
}
