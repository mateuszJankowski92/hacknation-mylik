import type { ReactNode } from 'react';
import type { ArtOwner } from '../roles/config';
import { nb } from '../typography';
import { HeroIllustration, type HeroIllustrationProps } from './HeroIllustration';
import { HeroStage } from './HeroStage';
import {
	HERO_HEADLINE,
	HERO_KICKER,
	HERO_STRUCK_WORD,
	HERO_SUBHEAD,
	HERO_SUBHEAD_FIRST_LINE,
	HERO_SUBHEAD_KEPT_WORD,
	HERO_SUBHEAD_SECOND_LINE,
} from './heroCopy';
import './hero.css';

export { HeroIllustration, type HeroIllustrationProps };

const NO_BREAK_SPACE = '\u00a0';

function HeroTitle() {
	return (
		<div className="hero__heading">
			<p className="hero__kicker">{nb(HERO_KICKER)}</p>
			<h1 id="hero-title" className="hero__title">
				{nb(HERO_HEADLINE)}
			</h1>
			<p className="hero__subtitle">
				<span className="visually-hidden">{nb(HERO_SUBHEAD)}</span>
				<span className="hero__subtitle-visual" aria-hidden="true">
					<span className="hero__subtitle-line">
						{HERO_SUBHEAD_FIRST_LINE}{' '}
						<span className="hero__nowrap">
							<span className="hero__struck">{HERO_STRUCK_WORD}</span>
							{NO_BREAK_SPACE}
							{HERO_SUBHEAD_KEPT_WORD}
						</span>
					</span>{' '}
					<span className="hero__subtitle-line">{nb(HERO_SUBHEAD_SECOND_LINE)}</span>
				</span>
			</p>
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
