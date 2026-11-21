import { useSyncExternalStore } from 'react';
import { SCENE_TEXTS } from './config';
import { readSceneSkipped, subscribeSceneSkipped, writeSceneSkipped } from './preferences';

export function SceneSetting() {
	const skipped = useSyncExternalStore(subscribeSceneSkipped, readSceneSkipped, () => false);
	return (
		<div className="scene-setting" role="group" aria-label={SCENE_TEXTS.settingsLabel}>
			<label className="scene-setting__label">
				<input
					type="checkbox"
					className="scene-setting__input"
					checked={!skipped}
					onChange={(event) => writeSceneSkipped(!event.target.checked)}
				/>
				{SCENE_TEXTS.setting}
			</label>
			<p className="scene-setting__hint">{SCENE_TEXTS.settingHint}</p>
		</div>
	);
}
