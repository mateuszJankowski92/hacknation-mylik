import { useEffect, useState } from 'react';
import { artCandidates, type ArtName, type ArtOwner } from './config';
import { drawingFor } from './drawings';
import './roles.css';

const resolvedFiles = new Map<string, string | null>();

function probe(url: string): Promise<boolean> {
	return new Promise((resolve) => {
		const image = new Image();
		image.onload = () => resolve(true);
		image.onerror = () => resolve(false);
		image.src = url;
	});
}

async function findArtFile(owner: ArtOwner, name: ArtName): Promise<string | null> {
	const key = `${owner}/${name}`;
	if (resolvedFiles.has(key)) return resolvedFiles.get(key) ?? null;
	for (const url of artCandidates(owner, name)) {
		if (await probe(url)) {
			resolvedFiles.set(key, url);
			return url;
		}
	}
	resolvedFiles.set(key, null);
	return null;
}

export function useArtFile(owner: ArtOwner, name: ArtName): string | null {
	const [file, setFile] = useState<string | null>(() => resolvedFiles.get(`${owner}/${name}`) ?? null);
	useEffect(() => {
		let active = true;
		setFile(resolvedFiles.get(`${owner}/${name}`) ?? null);
		void findArtFile(owner, name).then((url) => {
			if (active) setFile(url);
		});
		return () => {
			active = false;
		};
	}, [owner, name]);
	return file;
}

export interface RoleArtProps {
	owner: ArtOwner;
	name: ArtName;
	alt: string;
	className?: string;
	decorative?: boolean;
}

export function RoleArt({ owner, name, alt, className = '', decorative = false }: RoleArtProps) {
	const file = useArtFile(owner, name);
	const classes = `art ${className}`.trim();
	if (file) return <img className={classes} src={file} alt={decorative ? '' : alt} />;
	return (
		<svg
			className={classes}
			viewBox="0 0 160 160"
			focusable="false"
			role={decorative ? undefined : 'img'}
			aria-label={decorative ? undefined : alt}
			aria-hidden={decorative ? true : undefined}
		>
			{drawingFor(owner, name)}
		</svg>
	);
}
