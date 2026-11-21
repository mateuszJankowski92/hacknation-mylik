import type { ReactNode } from 'react';
import { BRAND_TAGLINE } from '../../../src/render/warning';
import type { ArtOwner } from '../roles/config';
import { HeroIllustration, type HeroIllustrationProps } from './HeroIllustration';
import { HeroStage } from './HeroStage';
import './hero.css';

export { HeroIllustration, type HeroIllustrationProps };

function HeroTitle() {
	return (
		<h1 id="hero-title" className="hero__title">
			{BRAND_TAGLINE}
		</h1>
	);
}

export interface HeroProps {
	children: ReactNode;
	illustration?: HeroIllustrationProps;
	role?: ArtOwner;
	art?: ReactNode;
}

export function Hero({ children, illustration, role, art }: HeroProps) {
	const compact = art === null;
	const stage = art === undefined ? <HeroStage illustration={illustration} /> : art === null ? null : <div className="hero__art">{art}</div>;
	return (
		<section
			className={compact ? 'hero hero--compact' : 'hero'}
			aria-labelledby="hero-title"
			data-role={role && role !== 'start' ? role : undefined}
		>
			<div className="hero__main">
				<HeroTitle />
				{stage}
				{children}
			</div>
		</section>
	);
}
