import type { ReactNode } from 'react';
import type { ArtName, ArtOwner, ResultKey } from './config';

function Person({ children }: { children?: ReactNode }) {
	return (
		<>
			<path className="art__body" d="M52 150 L52 108 Q52 90 80 90 Q108 90 108 108 L108 150 Z" />
			<circle className="art__skin" cx="80" cy="66" r="20" />
			{children}
		</>
	);
}

function Cloud({ x = 0, y = 0 }: { x?: number; y?: number }) {
	return (
		<path
			className="art__cloud"
			transform={`translate(${x} ${y})`}
			d="M44 100 Q30 100 30 86 Q30 72 46 72 Q50 54 72 54 Q92 54 98 72 Q116 72 116 88 Q116 100 102 100 Z"
		/>
	);
}

function Sun({ cx = 80, cy = 80, r = 26 }: { cx?: number; cy?: number; r?: number }) {
	const rays = Array.from({ length: 8 }, (_, index) => {
		const angle = (index * Math.PI) / 4;
		return (
			<line
				key={index}
				className="art__ray"
				x1={cx + Math.cos(angle) * (r + 8)}
				y1={cy + Math.sin(angle) * (r + 8)}
				x2={cx + Math.cos(angle) * (r + 20)}
				y2={cy + Math.sin(angle) * (r + 20)}
			/>
		);
	});
	return (
		<>
			{rays}
			<circle className="art__sun" cx={cx} cy={cy} r={r} />
		</>
	);
}

type DrawnOwner = 'start' | 'pogodynka' | 'bibliotekarka' | 'sport';

const CHARACTERS: Record<DrawnOwner, Record<'postac' | 'praca', ReactNode>> = {
	start: {
		postac: (
			<>
				<path className="art__panel" d="M20 36 L60 24 L60 132 L20 144 Z" />
				<path className="art__panel art__panel--light" d="M60 24 L100 36 L100 144 L60 132 Z" />
				<path className="art__panel" d="M100 36 L140 24 L140 132 L100 144 Z" />
				<path className="art__route" d="M34 112 L74 70 L114 96 L128 52" />
				<circle className="art__pin" cx="128" cy="52" r="6" />
			</>
		),
		praca: (
			<Person>
				<circle className="art__lens" cx="112" cy="104" r="12" />
				<line className="art__stroke" x1="121" y1="113" x2="134" y2="126" />
			</Person>
		),
	},
	pogodynka: {
		postac: (
			<>
				<rect className="art__panel" x="96" y="40" width="52" height="64" rx="4" />
				<Sun cx={122} cy={62} r={9} />
				<Person>
					<path className="art__hair" d="M60 66 Q60 42 80 42 Q100 42 100 66 Q92 54 80 54 Q68 54 60 66 Z" />
					<line className="art__stroke" x1="108" y1="108" x2="130" y2="86" />
				</Person>
			</>
		),
		praca: (
			<>
				<Cloud x={34} y={-34} />
				<Person>
					<path className="art__hair" d="M60 66 Q60 42 80 42 Q100 42 100 66 Q92 54 80 54 Q68 54 60 66 Z" />
					<rect className="art__paper" x="64" y="112" width="32" height="24" rx="2" />
				</Person>
			</>
		),
	},
	bibliotekarka: {
		postac: (
			<Person>
				<path className="art__hair" d="M60 66 Q60 42 80 42 Q100 42 100 66 Q92 54 80 54 Q68 54 60 66 Z" />
				<circle className="art__stroke-only" cx="73" cy="68" r="5" />
				<circle className="art__stroke-only" cx="87" cy="68" r="5" />
				<path className="art__paper" d="M56 118 L80 112 L104 118 L104 140 L80 134 L56 140 Z" />
				<line className="art__stroke" x1="80" y1="112" x2="80" y2="134" />
			</Person>
		),
		praca: (
			<>
				<rect className="art__panel" x="14" y="30" width="46" height="110" rx="3" />
				<rect className="art__book" x="20" y="40" width="8" height="30" />
				<rect className="art__book art__book--b" x="32" y="46" width="8" height="24" />
				<rect className="art__book" x="44" y="40" width="8" height="30" />
				<rect className="art__book art__book--b" x="20" y="86" width="8" height="30" />
				<rect className="art__book" x="32" y="92" width="8" height="24" />
				<g transform="translate(40 0)">
					<Person>
						<path className="art__hair" d="M60 66 Q60 42 80 42 Q100 42 100 66 Q92 54 80 54 Q68 54 60 66 Z" />
						<path className="art__paper" d="M62 118 L80 113 L98 118 L98 138 L80 133 L62 138 Z" />
					</Person>
				</g>
			</>
		),
	},
	sport: {
		postac: (
			<Person>
				<path className="art__hair" d="M60 62 Q64 44 80 44 Q96 44 100 62 Q90 52 80 52 Q70 52 60 62 Z" />
				<path className="art__stroke" d="M58 72 Q56 90 70 96" />
				<circle className="art__mic" cx="72" cy="98" r="7" />
				<line className="art__stroke" x1="72" y1="105" x2="76" y2="126" />
			</Person>
		),
		praca: (
			<>
				<rect className="art__paper" x="92" y="52" width="56" height="40" rx="3" />
				<line className="art__stroke" x1="100" y1="64" x2="140" y2="64" />
				<line className="art__stroke" x1="100" y1="74" x2="140" y2="74" />
				<line className="art__stroke" x1="100" y1="84" x2="124" y2="84" />
				<Person>
					<path className="art__hair" d="M60 62 Q64 44 80 44 Q96 44 100 62 Q90 52 80 52 Q70 52 60 62 Z" />
					<circle className="art__ball" cx="66" cy="124" r="10" />
				</Person>
			</>
		),
	},
};

const RESULTS: Record<ResultKey, ReactNode> = {
	potwierdzone: <Sun />,
	wprowadzajace_w_blad: (
		<>
			<Sun cx={96} cy={64} r={22} />
			<Cloud x={-6} y={26} />
		</>
	),
	falszywe: (
		<>
			<Cloud y={-14} />
			{[44, 66, 88].map((x) => (
				<line key={x} className="art__rain" x1={x} y1="98" x2={x - 8} y2="124" />
			))}
		</>
	),
	brak_wystarczajacych_dowodow: (
		<>
			{[56, 76, 96, 116].map((y, index) => (
				<line key={y} className="art__fog" x1={26 + (index % 2) * 14} y1={y} x2={134 - (index % 2) * 10} y2={y} />
			))}
		</>
	),
	nie_podlega_weryfikacji: (
		<>
			<path className="art__panel" d="M20 36 L60 24 L60 132 L20 144 Z" />
			<path className="art__panel art__panel--light" d="M60 24 L100 36 L100 144 L60 132 Z" />
			<path className="art__panel" d="M100 36 L140 24 L140 132 L100 144 Z" />
		</>
	),
	awaria_techniczna: <Static />,
	brak_mozliwosci_sprawdzenia: <Static />,
	potrzeba_doprecyzowania: <Static />,
};

function Static() {
	return (
		<>
			{[44, 62, 80, 98, 116].map((y, row) =>
				[30, 56, 82, 108].map((x, col) => (
					<rect
						key={`${row}-${col}`}
						className={(row + col) % 2 === 0 ? 'art__noise' : 'art__noise art__noise--light'}
						x={x}
						y={y}
						width="22"
						height="16"
					/>
				)),
			)}
		</>
	);
}

function charactersFor(owner: ArtOwner): Record<'postac' | 'praca', ReactNode> {
	return CHARACTERS[owner as DrawnOwner] ?? CHARACTERS.pogodynka;
}

export function drawingFor(owner: ArtOwner, name: ArtName): ReactNode {
	if (name === 'postac' || name === 'praca') return charactersFor(owner)[name];
	if (name === 'wskazuje') return charactersFor(owner).praca;
	return RESULTS[name];
}
