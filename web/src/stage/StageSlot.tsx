import { useCallback } from 'react';
import type { Role } from '../roles/config';
import { useStage, type SlotKind } from './StageContext';

interface StageSlotProps {
	kind: SlotKind;
	role?: Role;
}

export function StageSlot({ kind, role }: StageSlotProps) {
	const { registerSlot } = useStage();

	const attach = useCallback(
		(element: HTMLDivElement | null) => {
			registerSlot(kind, element ? { element, role } : null);
		},
		[kind, role, registerSlot],
	);

	return <div ref={attach} className={`stage-slot stage-slot--${kind}`} data-slot={kind} aria-hidden="true" />;
}
