export const LOGO_LABEL = 'Mylik, strona główna';

export function Logo() {
	return (
		<span className="logo">
			<svg className="logo__mark" viewBox="1 1.5 30 30" width="32" height="32" fill="none" aria-hidden="true" focusable="false">
				<path d="M7 3.5h12.5L26 10v17.5a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 6 27.5V5A1.5 1.5 0 0 1 7 3.5Z" fill="#fbf6ec" stroke="#2b2725" strokeWidth="2.2" strokeLinejoin="round" />
				<path d="M19.5 3.5V8.5A1.5 1.5 0 0 0 21 10h5" fill="#ee9b4b" stroke="#2b2725" strokeWidth="2.2" strokeLinejoin="round" />
				<circle cx="14.5" cy="20.5" r="4" fill="#ee9b4b" stroke="#2b2725" strokeWidth="2" />
			</svg>
			<span className="logo__word" aria-hidden="true">
				Mylik<span className="logo__dot">.</span>
			</span>
		</span>
	);
}
