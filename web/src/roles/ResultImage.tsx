import type { ResultKey, Role } from './config';
import { resultImageFor } from './config';
import { RoleArt } from './RoleArt';

export function ResultImage({ role, resultKey }: { role: Role; resultKey: ResultKey }) {
	const spec = resultImageFor(role, resultKey);
	if (!spec) return null;
	return (
		<figure className={`result-image result-image--${resultKey}`}>
			<RoleArt owner={role} name={resultKey} alt={spec.caption} className="result-image__art" />
			<figcaption className="result-image__caption">{spec.caption}</figcaption>
		</figure>
	);
}
