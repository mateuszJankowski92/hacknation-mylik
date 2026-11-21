import type { Role } from './config';
import { RoleArt } from './RoleArt';

export function ResultCorner({ role }: { role: Role }) {
	return (
		<div className="result-corner stage" aria-hidden="true">
			<RoleArt owner={role} name="praca" alt="" decorative className="result-corner__figure" />
		</div>
	);
}
