import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { clearLegacySceneChoice } from './scenes/preferences';
import './styles.css';

clearLegacySceneChoice();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
