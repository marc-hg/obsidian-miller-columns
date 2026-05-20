// Polyfill Obsidian DOM helpers for jsdom test environment

// jsdom doesn't implement innerText; map it to textContent for tests
Object.defineProperty(HTMLElement.prototype, 'innerText', {
    get(this: HTMLElement) { return this.textContent ?? ''; },
    set(this: HTMLElement, v: string) { this.textContent = v; },
    configurable: true,
});
/* eslint-disable @typescript-eslint/no-explicit-any */
const proto = HTMLElement.prototype as any;

proto.empty = function (this: HTMLElement) {
    this.innerHTML = '';
};

proto.createDiv = function (this: HTMLElement, opts?: { cls?: string } | string): HTMLDivElement {
    const el = document.createElement('div');
    const cls = typeof opts === 'string' ? opts : opts?.cls;
    if (cls) el.className = cls;
    this.appendChild(el);
    return el;
};

proto.createEl = function (this: HTMLElement, tag: string, opts?: any): HTMLElement {
    const el = document.createElement(tag);
    if (opts?.cls) el.className = opts.cls;
    if (opts?.text) el.textContent = opts.text;
    if (opts?.type) (el as HTMLInputElement).type = opts.type;
    this.appendChild(el);
    return el;
};

proto.createSpan = function (this: HTMLElement, opts?: { text?: string }): HTMLSpanElement {
    const el = document.createElement('span');
    if (opts?.text) el.textContent = opts.text;
    this.appendChild(el);
    return el;
};

proto.addClass = function (this: HTMLElement, cls: string): void {
    this.classList.add(cls);
};

proto.onClickEvent = function (this: HTMLElement, callback: (e: MouseEvent) => void): void {
    this.addEventListener('click', callback as EventListener);
};
