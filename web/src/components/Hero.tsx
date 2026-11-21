import type { ReactNode } from 'react';
import { BRAND_TAGLINE } from '../../../src/render/warning';
import { artAlt, type ArtOwner } from '../roles/config';
import { RoleArt } from '../roles/RoleArt';
import './hero.css';

export interface HeroIllustrationProps {
	src?: string;
	alt?: string;
	role?: ArtOwner;
}

export function HeroIllustration({ src, alt = '', role = 'start' }: HeroIllustrationProps) {
	return (
		<div className="hero__illustration">
			<div className="hero__frame illustration-frame">
				{src ? (
					<img className="hero__image" src={src} alt={alt} />
				) : (
					<RoleArt owner={role} name="postac" alt={artAlt(role, 'postac')} className="hero__placeholder" decorative />
				)}
			</div>
		</div>
	);
}

export function Hero({ children, illustration, role }: { children: ReactNode; illustration?: HeroIllustrationProps; role?: ArtOwner }) {
	return (
		<section className="hero" aria-labelledby="hero-title" data-role={role && role !== 'start' ? role : undefined}>
			<div className="hero__main">
				<h1 id="hero-title" className="hero__title">
					{BRAND_TAGLINE}
				</h1>
				<HeroIllustration role={role} {...illustration} />
				{children}
			</div>
		</section>
	);
}
