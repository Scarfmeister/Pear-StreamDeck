import en from '../../en.json';
import de from '../../de.json';
import fr from '../../fr.json';

export type Translate = (english: string, parameters?: Record<string, string | number>) => string;
const resources = {en: en.Localization.Strings, de: de.Localization.Strings, fr: fr.Localization.Strings};

export function locale(language: unknown): keyof typeof resources {
    const code = typeof language === 'string' ? language.toLowerCase().split(/[-_]/)[0] : 'en';
    return code === 'de' || code === 'fr' ? code : 'en';
}

/** Bundled text only. Never translate metadata, IDs, settings, or arbitrary HTML. */
export function translator(language: unknown): Translate {
    const strings: Record<string, string> = resources[locale(language)];
    return (english, parameters = {}) => {
        let key = english;
        let values = parameters;
        const numbered = english.match(/^(Playlist |Choose a supported startup mode for playlist )(\d+)(.*)$/);
        if (numbered) { key = numbered[1] + '{index}' + numbered[3]; values = {...values, index: numbered[2]}; }
        const http = english.match(/^Pear request failed \(HTTP (\d+)\)\.$/);
        const failure = english.match(/^Pear request failed \(([a-z-]+)\)\.$/);
        if (http) { key = 'Pear request failed (HTTP {status}).'; values = {...values, status: http[1]}; }
        else if (failure) { key = 'Pear request failed ({code}).'; values = {...values, code: failure[1]}; }
        const text = Object.prototype.hasOwnProperty.call(strings, key) ? strings[key] : english;
        return text.replace(/\{([a-z]+)\}/g, (match, name: string) =>
            Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match);
    };
}

export function localizeDocument(document: Document, language: unknown): void {
    const t = translator(language);
    document.documentElement.lang = locale(language);
    for (const element of Array.from(document.querySelectorAll<HTMLElement>('[data-i18n]'))) {
        element.textContent = t(element.dataset.i18n ?? '');
    }
    for (const element of Array.from(document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]'))) {
        element.placeholder = t(element.dataset.i18nPlaceholder ?? '');
    }
}
