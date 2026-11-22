export interface DotCell {
	x: number;
	y: number;
	marked: boolean;
}

export interface DotMatrix {
	cells: DotCell[];
	width: number;
	height: number;
	columns: number;
	pitch: number;
}

export const DOT_MATRIX_LIMIT = 120;
const DOT_PITCH = 22;

export function buildDotMatrix(errors: number, total: number): DotMatrix | null {
	if (!Number.isInteger(total) || !Number.isInteger(errors)) return null;
	if (total <= 0 || total > DOT_MATRIX_LIMIT || errors < 0 || errors > total) return null;
	const columns = total <= 10 ? total : Math.min(10, Math.ceil(Math.sqrt(total * 2)));
	const rows = Math.ceil(total / columns);
	const cells: DotCell[] = [];
	const markedStep = errors > 0 ? total / errors : 0;
	const markedIndexes = new Set<number>();
	for (let index = 0; index < errors; index += 1) markedIndexes.add(Math.min(total - 1, Math.floor(index * markedStep)));
	for (let index = 0; index < total; index += 1) {
		cells.push({
			x: (index % columns) * DOT_PITCH + DOT_PITCH / 2,
			y: Math.floor(index / columns) * DOT_PITCH + DOT_PITCH / 2,
			marked: markedIndexes.has(index),
		});
	}
	return { cells, width: columns * DOT_PITCH, height: rows * DOT_PITCH, columns, pitch: DOT_PITCH };
}
