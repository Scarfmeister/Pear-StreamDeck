import {MAX_PLAYLIST_ENTRIES, MAX_PLAYLIST_IMAGE_BYTES, playlistEntries, playlistImage} from './playlist-selector-settings';
import {PLAYLIST_STARTUP_MODES} from '../pear/playlist';
import {Translate} from './localization';

type Row = {name: HTMLInputElement; input: HTMLInputElement; mode: HTMLSelectElement; image?: string; revision: number};

/** Host settings editor only: no Pear connection, remote images, or HTML from user input. */
export class PlaylistSelectorEditor {
    private rows: Row[] = [];
    private nextId = 0;
    private pendingImages = 0;
    constructor(private readonly container: HTMLElement, private readonly add: HTMLButtonElement,
                private readonly changed: () => void, private readonly message: (text: string) => void,
                private readonly t: Translate = text => text) {
        add.onclick = () => {
            if (this.rows.length >= MAX_PLAYLIST_ENTRIES) return;
            this.append('', '', 'FOLLOW_SHUFFLE_STATE');
            this.changed();
        };
    }

    render(settings: unknown): void {
        this.rows = [];
        this.pendingImages = 0;
        this.container.replaceChildren();
        for (const entry of playlistEntries(settings)) this.append(entry.name, entry.input, entry.startupMode, entry.image);
        this.add.disabled = this.rows.length >= MAX_PLAYLIST_ENTRIES;
    }

    edits(): {playlists: Record<string, unknown>[]} {
        if (this.pendingImages) throw new Error('Wait for the selected image to finish loading before saving.');
        return {playlists: this.rows.map(row => ({name: row.name.value, playlistInput: row.input.value,
            startupMode: row.mode.value, ...(row.image ? {image: row.image} : {})}))};
    }

    private append(name: string, input: string, mode: string, image?: string): void {
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'playlist-entry';
        const legend = document.createElement('legend');
        legend.textContent = this.t('Playlist entry');
        fieldset.appendChild(legend);
        const id = ++this.nextId;
        const text = (label: string, suffix: string, value: string, maxLength: number) => {
            const element = document.createElement('input');
            element.type = 'text'; element.value = value; element.maxLength = maxLength; element.spellcheck = false;
            this.field(fieldset, label, element, `playlist-${id}-${suffix}`);
            element.addEventListener('input', this.changed);
            return element;
        };
        const nameInput = text('Name', 'name', name, 128); // Unicode validation uses code points, not UTF-16 length.
        const playlistInput = text('URL or ID', 'input', input, 4096);
        const select = document.createElement('select');
        for (const startupMode of PLAYLIST_STARTUP_MODES) {
            const option = document.createElement('option');
            option.value = startupMode;
            option.textContent = this.t({FOLLOW_SHUFFLE_STATE: 'Follow Shuffle State', ALWAYS_NORMAL: 'Always Normal', ALWAYS_SHUFFLE: 'Always Shuffle'}[startupMode]);
            select.appendChild(option);
        }
        select.value = mode;
        select.addEventListener('input', this.changed);
        this.field(fieldset, 'Start mode', select, `playlist-${id}-mode`);
        const row: Row = {name: nameInput, input: playlistInput, mode: select, image, revision: 0};
        this.rows.push(row);
        const imageInput = document.createElement('input');
        imageInput.type = 'file'; imageInput.accept = 'image/png,image/jpeg';
        this.field(fieldset, 'Image', imageInput, `playlist-${id}-image`);
        const preview = document.createElement('img');
        preview.alt = this.t('Playlist image preview'); preview.width = 38; preview.height = 38;
        const refreshPreview = () => { preview.hidden = !row.image; if (row.image) preview.src = row.image; else preview.removeAttribute('src'); };
        refreshPreview(); fieldset.appendChild(preview);
        imageInput.addEventListener('change', () => {
            const file = imageInput.files?.[0];
            if (!file) return;
            if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > MAX_PLAYLIST_IMAGE_BYTES) {
                this.message('Choose a PNG or JPEG of at most 24 KiB.'); imageInput.value = ''; return;
            }
            const revision = ++row.revision;
            const rows = this.rows;
            this.changed();
            ++this.pendingImages;
            const reader = new FileReader();
            const finish = (failed: boolean) => {
                if (rows !== this.rows) return;
                --this.pendingImages;
                if (!this.rows.includes(row) || revision !== row.revision) return;
                const data = failed ? undefined : playlistImage(reader.result);
                if (!data) { this.message('Could not read a valid PNG or JPEG image.'); return; }
                row.image = data;
                refreshPreview();
                this.changed();
            };
            reader.onload = () => finish(false);
            reader.onerror = () => finish(true);
            reader.onabort = () => finish(true);
            reader.readAsDataURL(file);
        });
        const clear = document.createElement('button');
        clear.type = 'button'; clear.textContent = this.t('Clear image');
        clear.onclick = () => { ++row.revision; row.image = undefined; imageInput.value = ''; refreshPreview(); this.changed(); };
        fieldset.appendChild(clear);
        const remove = document.createElement('button');
        remove.type = 'button'; remove.textContent = this.t('Remove entry');
        remove.onclick = () => {
            this.rows.splice(this.rows.indexOf(row), 1);
            fieldset.remove();
            this.add.disabled = false;
            this.changed();
        };
        fieldset.appendChild(remove);
        this.container.appendChild(fieldset);
        this.add.disabled = this.rows.length >= MAX_PLAYLIST_ENTRIES;
    }

    private field(parent: HTMLElement, caption: string, input: HTMLElement, id: string): void {
        const wrapper = document.createElement('div'); wrapper.className = 'sdpi-item';
        const label = document.createElement('label'); label.className = 'sdpi-item-label'; label.textContent = this.t(caption); label.htmlFor = id;
        input.id = id; input.className = 'sdpi-item-value';
        wrapper.appendChild(label); wrapper.appendChild(input); parent.appendChild(wrapper);
    }
}
