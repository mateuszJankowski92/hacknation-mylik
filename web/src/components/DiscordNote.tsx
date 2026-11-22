import { DISCORD_INVITE_URL } from '../siteConfig';
import { nb } from '../typography';
import './discord.css';

export const DISCORD_TEXTS = {
	lead: 'Możesz też zapytać na Discordzie:',
	command: '/sprawdz',
	link: 'Dodaj Mylika',
	newTab: ' (otworzy się w nowej karcie)',
} as const;

function BubbleIcon() {
	return (
		<svg className="discord-note__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M4.5 5.5h15v10.5h-9l-4 3.5V16h-2z" />
			<path d="M8.5 9h7M8.5 12h4" />
		</svg>
	);
}

export function DiscordNote() {
	return (
		<aside className="discord-note" aria-label="Mylik na Discordzie">
			<BubbleIcon />
			<p className="discord-note__text">
				{nb(DISCORD_TEXTS.lead)} <code className="discord-note__command">{DISCORD_TEXTS.command}</code>
			</p>
			<a className="discord-note__link" href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
				{DISCORD_TEXTS.link}
				<span className="visually-hidden">{DISCORD_TEXTS.newTab}</span>
			</a>
		</aside>
	);
}
