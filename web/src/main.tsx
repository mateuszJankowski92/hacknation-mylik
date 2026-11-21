import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { getSettings } from './a11y/settings';
import { App } from './App';
import { clearLegacySceneChoice } from './scenes/preferences';
import './styles.css';

clearLegacySceneChoice();
getSettings();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
