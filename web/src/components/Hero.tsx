import type { ReactNode } from 'react';
import { BRAND_TAGLINE } from '../../../src/render/warning';
import './hero.css';

export interface HeroIllustrationProps {
	src?: string;
	alt?: string;
}

export function HeroIllustration({ src, alt = '' }: HeroIllustrationProps) {
	return (
		<div className="hero__illustration">
			{src ? (
				<img className="hero__image" src={src} alt={alt} />
			) : (
				<svg className="hero__placeholder" viewBox="0 0 160 160" aria-hidden="true" focusable="false">
					<path className="hero__fold hero__fold--back" d="M20 36 L60 24 L60 132 L20 144 Z" />
					<path className="hero__fold hero__fold--mid" d="M60 24 L100 36 L100 144 L60 132 Z" />
					<path className="hero__fold hero__fold--front" d="M100 36 L140 24 L140 132 L100 144 Z" />
					<path className="hero__route" d="M34 112 L74 70 L114 96 L128 52" />
					<circle className="hero__pin" cx="128" cy="52" r="6" />
				</svg>
			)}
		</div>
	);
}

export function Hero({ children, illustration }: { children: ReactNode; illustration?: HeroIllustrationProps }) {
	return (
		<section className="hero" aria-labelledby="hero-title">
			<div className="hero__main">
				<h1 id="hero-title" className="hero__title">
					{BRAND_TAGLINE}
				</h1>
				<HeroIllustration {...illustration} />
				{children}
			</div>
		</section>
	);
}
