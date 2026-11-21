import type { ProgressState } from '../visuals/progress';
import './scenes.css';

const MAX_MARKS = 12;

export function SceneMarks({ progress }: { progress: ProgressState }) {
	const marks = progress.pebbles.slice(0, MAX_MARKS);
	return (
		<ul className="scene__marks" aria-hidden="true" data-count={progress.pebbles.length}>
			{marks.map((pebble) => (
				<li key={pebble.id} className={`scene__mark scene__mark--${pebble.stance}`} />
			))}
		</ul>
	);
}
