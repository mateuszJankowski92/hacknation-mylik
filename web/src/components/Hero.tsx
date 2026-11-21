import type { ReactNode } from 'react';
import { BRAND_HEADLINE, BRAND_SUBHEAD } from '../../../src/render/warning';
import type { ArtOwner } from '../roles/config';
import { nb } from '../typography';
import { HeroIllustration, type HeroIllustrationProps } from './HeroIllustration';
import { HeroStage } from './HeroStage';
import './hero.css';

export { HeroIllustration, type HeroIllustrationProps };

function HeroTitle() {
	return (
		<div className="hero__heading">
			<h1 id="hero-title" className="hero__title">
				{nb(BRAND_HEADLINE)}
			</h1>
			<p className="hero__subtitle">{nb(BRAND_SUBHEAD)}</p>
		</div>
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
