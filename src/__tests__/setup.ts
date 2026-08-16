// Polyfill Obsidian DOM helpers for jsdom test environment
import { beforeEach } from 'vitest';
import { resetKeyboardFocusForTests } from '../ui/keyboard';

beforeEach(() => {
	resetKeyboardFocusForTests();
});

// Obsidian Node.instanceOf — drop-in for instanceof across windows.
if (!Node.prototype.instanceOf) {
	Object.defineProperty(Node.prototype, 'instanceOf', {
		value(this: Node, type: new () => unknown) {
			return this instanceof type;
		},
		configurable: true,
	});
}

// jsdom doesn't implement innerText; map it to textContent for tests
Object.defineProperty(HTMLElement.prototype, 'innerText', {
	get(this: HTMLElement) {
		return this.textContent ?? '';
	},
	set(this: HTMLElement, v: string) {
		this.textContent = v;
	},
	configurable: true,
});

type CreateElOptions = {
	cls?: string;
	text?: string;
	type?: string;
};

type ObsidianDomHelpers = {
	empty(): void;
	createDiv(opts?: { cls?: string } | string): HTMLDivElement;
	createEl(tag: string, opts?: CreateElOptions): HTMLElement;
	createSpan(opts?: { text?: string; cls?: string }): HTMLSpanElement;
	addClass(cls: string): void;
	removeClass(cls: string): void;
	onClickEvent(callback: (e: MouseEvent) => void): void;
};

// Cast through unknown: Obsidian's HTMLElement.createEl signature is a
// generic overload our jsdom stub cannot satisfy.
const proto = HTMLElement.prototype as unknown as ObsidianDomHelpers;

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

proto.createEl = function (this: HTMLElement, tag: string, opts?: CreateElOptions): HTMLElement {
	const el = document.createElement(tag);
	if (opts?.cls) el.className = opts.cls;
	if (opts?.text) el.textContent = opts.text;
	if (opts?.type) (el as HTMLInputElement).type = opts.type;
	this.appendChild(el);
	return el;
};

proto.createSpan = function (this: HTMLElement, opts?: { text?: string; cls?: string }): HTMLSpanElement {
	const el = document.createElement('span');
	if (opts?.cls) el.className = opts.cls;
	if (opts?.text) el.textContent = opts.text;
	this.appendChild(el);
	return el;
};

proto.addClass = function (this: HTMLElement, cls: string): void {
	this.classList.add(cls);
};

proto.removeClass = function (this: HTMLElement, cls: string): void {
	this.classList.remove(cls);
};

proto.onClickEvent = function (this: HTMLElement, callback: (e: MouseEvent) => void): void {
	this.addEventListener('click', callback as EventListener);
};
