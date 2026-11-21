import { buildDotMatrix } from '../../../src/card/visuals';
import type { ErrorProfile } from '../../../src/contracts/record';
import './visuals.css';

export function errorSentence(profile: Pick<ErrorProfile, 'errors' | 'total'>): string {
	const times = profile.errors === 1 ? 'raz' : 'razy';
	return `Mylik też się myli. Przy takiej podstawie pomyliłem się ${profile.errors} ${times} na ${profile.total} sprawdzeń:`;
}

export function ErrorDots({ profile }: { profile: ErrorProfile }) {
	if (profile.total <= 0) return null;
	const matrix = buildDotMatrix(profile.errors, profile.total);
	const sentence = errorSentence(profile);
	return (
		<section className="error-dots" aria-label="Własna omylność Mylika">
			<p className="error-dots__sentence">{sentence}</p>
			{matrix && (
				<>
					<svg
						className="error-dots__picture"
						viewBox={`0 0 ${matrix.width} ${matrix.height}`}
						width={matrix.width}
						height={matrix.height}
						role="img"
						aria-label={`Pomyłki: ${profile.errors} z ${profile.total} sprawdzeń. Każda pomyłka jest zaznaczona krzyżykiem.`}
					>
						{matrix.cells.map((cell, index) =>
							cell.marked ? (
								<path
									key={index}
									className="error-dots__miss"
									d={`M ${cell.x - 6} ${cell.y - 6} L ${cell.x + 6} ${cell.y + 6} M ${cell.x + 6} ${cell.y - 6} L ${cell.x - 6} ${cell.y + 6}`}
								/>
							) : (
								<circle key={index} className="error-dots__ok" cx={cell.x} cy={cell.y} r="6" />
							),
						)}
					</svg>
					<p className="error-dots__legend">Kółko: sprawdziłem dobrze. Krzyżyk: pomyliłem się.</p>
				</>
			)}
		</section>
	);
}
