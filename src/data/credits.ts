import creditsRaw from '../assets/backgrounds/credits.json';
import { type Credit, creditsParse } from '../logic/credits-parse';

/** Attribution for bundled images, keyed by file name; images without an entry are simply not credited. */
export const CREDITS: ReadonlyMap<string, Credit> = creditsParse(creditsRaw);
