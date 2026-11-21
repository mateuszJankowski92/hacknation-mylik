import { useState } from 'react';
import { artAlt, START_CHARACTER_ALT, type ArtOwner } from '../roles/config';
import { imageEntryFor, imageUrlFor } from '../roles/manifest';
import { RoleArt } from '../roles/RoleArt';

export interface HeroIllustrationProps {
	src?: string;
	alt?: string;
	role?: ArtOwner;
}

export function HeroIllustration({ src, alt = '', role = 'start' }: HeroIllustrationProps) {
	const [broken, setBroken] = useState(false);
	const file = src ?? imageUrlFor(role, 'postac');
	if (file && !broken) {
		const entry = imageEntryFor(role, 'postac');
		const text = src ? alt : (entry?.alt ?? START_CHARACTER_ALT);
		return <img className="hero__image" src={file} alt={text} onError={() => setBroken(true)} />;
	}
	return <RoleArt owner={role} name="postac" alt={artAlt(role, 'postac')} className="hero__placeholder" decorative />;
}
