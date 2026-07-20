export function isRecordsRequestLoading(
	records: readonly unknown[] | null,
	error: unknown,
	hasFinished: boolean,
	isResolving: boolean
): boolean {
	return ! error && records === null && ( isResolving || ! hasFinished );
}

export function buildContentPickerQuery(
	filter: string,
	categoryIds: readonly number[] = [],
	tagIds: readonly number[] = []
): Record< string, unknown > {
	return {
		context: 'edit',
		order: 'desc',
		orderby: filter ? 'relevance' : 'date',
		per_page: 20,
		search: filter || undefined,
		status: 'publish',
		categories: categoryIds.length > 0 ? categoryIds : undefined,
		tags: tagIds.length > 0 ? tagIds : undefined,
	};
}

export function buildSelectedContentPickerQuery(
	selectedIds: readonly number[]
): Record< string, unknown > {
	return {
		context: 'edit',
		include: selectedIds,
		order: 'asc',
		orderby: 'include',
		per_page: Math.max( 1, selectedIds.length ),
		status: 'publish',
	};
}
