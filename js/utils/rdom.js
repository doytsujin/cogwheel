//@ts-check

/* RDOM (rotonde dom)
 * 0x0ade's collection of DOM manipulation functions because updating innerHTML every time a single thing changes isn't cool.
 * This started out as a mini framework for Rotonde.
 * Mostly oriented towards manipulating ordered collections, f.e. feeds.
 */

/**
 * A RDOM list context, to be used for feeds.
 */
class RDOMListCtx {

    /**
     * @param {RDOM} rdom
     * @param {HTMLElement} container 
     */
    constructor(rdom, container) {
        this.rdom = rdom;
        this.container = container;

        /**
         * Culling setup.
         */
        this._cull = {
            active: false,
            min: -1,
            max: -1,
            offset: 0,
        };

        /** 
         * List of previously added elements.
         * This list will be checked against [added] on cleanup, ensuring that any zombies will be removed properly.
         * @type {HTMLElement[]}
         */
        this.prev = [];
        /**
         * List of [rdom.add]ed elements.
         * This list will be used and reset in [rdom.cleanup].
         * @type {HTMLElement[]}
         */
        this.added = [];

        /**
         * All current element -> object mappings.
         * @type {Map<HTMLElement, any>}
         */
        this.references = new Map();
        /**
         * All current object -> element mappings.
         * @type {Map<any, HTMLElement>}
         */
        this.elements = new Map();
        /**
         * All current object -> HTML source mappings, avoiding the slow innerHTML comparison.
         * @type {Map<any, string>}
         */
        this.htmls = new Map();
    }
    
    /**
     * Sets up a culling context with the given parameters.
     * @param {number} min Minimum index, inclusive.
     * @param {number} max Maximum index, exclusive.
     * @param {number} offset Offset, which will be used when calculating the actual index.
     */
    cull(min, max, offset) {
        this._cull.active = true;
        if (min === -1 || max === -1 ||
            min === undefined || max === undefined) {
            this._cull.active = false;
            min = max = -1;
        }
        this._cull.min = min;
        this._cull.max = max;

        this._cull.offset = offset !== undefined ? offset : 0;
    }

    /**
     * Adds or updates an element at the given index.
     * For best performance in paginated / culled containers, pass a function as [html]. It only gets used if the element is visible.
     * This function needs a reference object so that it can find and update existing elements for any given object.
     * For example:
     * When adding entries to a list, [ref] is the entry being added.
     * Instead of blindly clearing the list and re-adding all entries, this checks if an element for the entry exists and updates it.
     * @param {any} ref The reference object belonging to the element.
     * @param {number} index The index at which the element will be added.
     * @param {function | string} html The element itself in its string form, or its generator.
     * @returns The created / updated wrapper element.
     */
    add(ref, index, html) {
        // Let's hope that making this method async doesn't break culling.
        if (this._cull.active && (index < this._cull.min || this._cull.max <= index)) {
            // Out of bounds - remove if existing, don't add.
            this.removeRef(ref);
            return null;
        }

        /** @type {string | HTMLElement} */
        var el;
        if (typeof(html) === "object") {
            // Assume that we're adding an element directly.
            el = html;
            // Replace any existing element with the new one.
            this.removeRef(ref);
            this.container.appendChild(el);

        } else {
            // Assume that we're given the html contents of the element.
            if (typeof(html) === "function") {
                // If we're given a function, call it now.
                // We don't need its result if the element's culled away.
                html = html();
            }
            // Check if we already added an element for ref.
            // If so, update it. Otherwise create and add a new element.
            el = this.elements.get(ref);
            if (!el) {
                // The element isn't existing yet; create and add it.
                var range = document.createRange();
                range.selectNode(this.container);
                // @ts-ignore el is guaranteed to be a HTMLElement.
                el = range.createContextualFragment(`<span class='rdom-wrapper'>${html}</span>`).firstElementChild;
                // @ts-ignore el is guaranteed to be a HTMLElement.
                this.container.appendChild(el);
            } else if (this.htmls.get(ref) !== html) {
                // Update the innerHTML of our thin wrapper.
                // @ts-ignore html is guaranteed to be a string.
                el.innerHTML = html;
            }
        }

        if (index > -1) {
            // Move the element to the given index.
            // @ts-ignore el is guaranteed to be a ChildNode.
            this.rdom.move(el, index + this._cull.offset);
        }

        // Register the element as "added:" It's not a zombie.
        // @ts-ignore el is guaranteed to be a HTMLElement.
        this.added.push(el);
        // Register the element as the element of ref.
        // @ts-ignore el is guaranteed to be a HTMLElement.
        this.references.set(el, ref);
        // @ts-ignore el is guaranteed to be a HTMLElement.
        this.elements.set(ref, el);
        // @ts-ignore html is guaranteed to be a string.
        this.htmls.set(ref, html);

        return el;
    }

    /**
     * Removes an object's element from this context, both the element in the DOM and all references in RDOM.
     * @param {any} ref The reference object of the element to remove.
     */
    removeRef(ref) {
        if (!ref)
            return;
        var el = this.elements.get(ref);
        if (!el)
            return; // The ref object doesn't belong to this context - no element found.
        // Remove the element and all related object references from the context.
        this.elements.delete(ref);
        this.references.delete(el);
        this.htmls.delete(ref);
        // Remove the element from the DOM.
        el.remove();
    }

    /**
     * Remove an element from this context, both the element in the DOM and all references in RDOM.
     * @param {HTMLElement} el The element to remove.
     */
    removeElement(el) {
        if (!el)
            return;
        var ref = this.references.get(el);
        if (!ref)
            return; // The element doesn't belong to this context - no ref object found.
        // Remove the element and all related object references from the context.
        this.references.delete(el);
        this.elements.delete(ref);
        this.htmls.delete(ref);
        // Remove the element from the DOM.
        el.remove();
    }

    /**
     * Remove zombie elements.
     * Call this after the last [add].
     */
    cleanup() {
        for (var el of this.prev) {
            if (this.added.indexOf(el) > -1)
                continue;
            this.removeElement(el);
        }
        this.prev = this.added;
        this.added = [];
    }

}

class RDOM {

    constructor() {
        /** @type {Map<HTMLElement, RDOMListCtx>} */
        this.contexts = new Map();

        /** @type {HTMLElement} */
        this._contextLastContainer = null;
        /** @type {RDOMListCtx} */
        this._contextLast = null;
    }

    /**
     * Gets or creates a [RDOMListCtx] for the given container element.
     * @param {HTMLElement} container The container element to which elements will be added to.
     * @returns {RDOMListCtx} The RDOM list context for the container element.
     */
    list(container) {
        if (this._contextLastContainer === container)
            return this._contextLast;

        this._contextLastContainer = container;
        var ctx = this.contexts.get(container);
        if (!ctx)
            this.contexts.set(container, ctx = new RDOMListCtx(this, container));
        return this._contextLast = ctx;
    }

    /**
     * Move an element to a given index non-destructively.
     * @param {ChildNode} el The element to move.
     * @param {number} index The target index.
     */
    move(el, index) {
        if (!el)
            return;

        var offset = index;
        var tmp = el;
        // @ts-ignore previousElementSibling is too new?
        while (tmp = tmp.previousElementSibling)
            offset--;

        // offset == 0: We're fine.
        if (offset == 0)
            return;

        if (offset < 0) {
            // offset < 0: Element needs to be pushed "left" / "up".
            // -offset is the "# of elements we expected there not to be",
            // thus how many places we need to shift to the left.
            var swap;
            tmp = el;
            // @ts-ignore previousElementSibling is too new?
            while ((swap = tmp) && (tmp = tmp.previousElementSibling) && offset < 0)
                offset++;
            // @ts-ignore before is too new?
            swap.before(el);
            
        } else {
            // offset > 0: Element needs to be pushed "right" / "down".
            // offset is the "# of elements we expected before us but weren't there",
            // thus how many places we need to shift to the right.
            var swap;
            tmp = el;
            // @ts-ignore previousElementSibling is too new?
            while ((swap = tmp) && (tmp = tmp.nextElementSibling) && offset > 0)
                offset--;
            // @ts-ignore after is too new?
            swap.after(el);
        }
    }

}

var rdom = window["rdom"] = new RDOM();
