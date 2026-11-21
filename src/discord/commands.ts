export const SLASH_COMMAND_NAME = 'sprawdz';
export const MESSAGE_COMMAND_NAME = 'Sprawdź z Mylikiem';
export const TEXT_OPTION_NAME = 'tekst';
export const PUBLIC_OPTION_NAME = 'publicznie';
export const DISCORD_MAX_TEXT_CHARS = 2000;
export const DISCORD_MAX_CONTENT_CHARS = 2000;

export const INTERACTION_TYPE = {
	ping: 1,
	applicationCommand: 2,
} as const;

export const COMMAND_TYPE = {
	slash: 1,
	message: 3,
} as const;

export const CALLBACK_TYPE = {
	pong: 1,
	message: 4,
	deferredMessage: 5,
} as const;

export const EPHEMERAL_FLAG = 64;
