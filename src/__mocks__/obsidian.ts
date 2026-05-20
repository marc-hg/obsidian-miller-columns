// Stub for Obsidian API — used by vitest (the real package is types-only, no JS)
export class Plugin {
    app: any;
    _postProcessor: any;
    constructor(app: any, _manifest?: any) { this.app = app; }
    registerMarkdownPostProcessor(cb: any) { this._postProcessor = cb; }
}

export class MarkdownView {}
