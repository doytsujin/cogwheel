//@ts-check

/* RDOM (rotonde dom)
 * 0x0ade's collection of DOM manipulation functions because updating innerHTML every time a single thing changes isn't cool.
 * This started out as a mini framework for Rotonde.
 * Mostly oriented towards manipulating paginated / culled ordered collections, f.e. feeds.
 */

 /**
  * RDOM helper for rd$-generated elements.
  */
 class RDOMElement extends HTMLElement {
     /**
      * @param {HTMLElement} el
      */
    constructor(el) {
        // Prevent VS Code from complaining about the lack of super()
        if (false) super();

        if (el["isRDOM"])
            // @ts-ignore
            return el;
        el["isRDOM"] = true;
        
        // Bind all functions from RDOMElement to the HTMLElement.
        for (let name of Object.getOwnPropertyNames(RDOMElement.prototype)) {
            if (name === "constructor")
                continue;
            el[name] = RDOMElement.prototype[name].bind(el);
        }

        // Return the modified HTMLElement.
        if (!el)
            return null;
        if (el)
            // @ts-ignore
            return el;

        // Fields.
        this.isRDOM = true;
    }

    /**
     * Replace all rdom-placeholder elements with the elements in the array.
     * @param {HTMLElement[]} placeheld
     */
    rdomReplacePlaceholders(placeheld) {
        let placeholders = this.getElementsByTagName("rdom-placeholder");
        for (let i in placeheld) {
            let placeholder = placeholders.item(0);
            placeholder.parentNode.replaceChild(placeheld[i], placeholder);
        }
    }

    /**
     * Fill all rdom-field elements with the provided elements.
     * @param {any} data
     * @returns {RDOMElement}
     */
    rdomSet(data) {
        for (let key in data) {
            let value = data[key];
            let field = this.querySelector(`rdom-field[rdom-field-key=${key}]`);
            if (!field) {
                // Field doesn't exist, warn the user.
                console.error("[rdom]", "rdom-field not found:", key, "in", this);
                continue;
            }
            if (!value) {
                // Value is false-ish, clear the field.
                while (field.firstChild)
                    field.removeChild(field.firstChild);
                continue;
            }

            // Remove all other children and remove the last remaining child,
            // or append the value as the first child.
            let children = field.children;
            while (children.length > 1) {
                field.removeChild(children.item(1));
            }
            let left = field.firstChild;
            if (left) {
                if (left !== value)
                    field.replaceChild(value, left);
            } else {
                field.appendChild(value);
            }
        }

        return this;
    }

    /**
     * Get the value of the rdom-field with the given key.
     * @param {string} key
     * @returns {RDOMElement}
     */
    rdomGet(key) {
        let field = this.querySelector(`rdom-field[rdom-field-key=${key}]`);
        if (!field)
            return null;
        //@ts-ignore
        return field.firstElementChild;
    }
 }

  /**
  * RDOM helper for RDOMCtx.
  */
 class RDOMContainer extends HTMLElement {
    /**
     * @param {HTMLElement} el
     */
    constructor(el) {
        // Prevent VS Code from complaining about the lack of super()
        if (false) super();

        if (el["isRDOMCtx"])
            // @ts-ignore
            return el;
        el["isRDOMCtx"] = true;
        
        // @ts-ignore
        el["rdomCtx"] = new RDOMCtx(el);

        // Return the modified HTMLElement.
        if (!el)
            return null;
        if (el)
            // @ts-ignore
            return el;

        // Fields.
        /** @type {RDOMCtx} */
        this.rdomCtx = null;
    }
}

/**
 * A RDOM context.
 */
class RDOMCtx {
    /**
     * @param {RDOMContainer} container 
     */
    constructor(container) {
        if (!container["isRDOMCtx"])
            container = new RDOMContainer(container);
        this.container = container;
        this.container.rdomCtx = this;

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
         * @type {RDOMElement[]}
         */
        this.prev = [];
        /**
         * List of [rdom.add]ed elements.
         * This list will be used and reset in [rdom.cleanup].
         * @type {RDOMElement[]}
         */
        this.added = [];

        /**
         * All current element -> object mappings.
         * @type {Map<RDOMElement, any>}
         */
        this.references = new Map();
        /**
         * All current object -> element mappings.
         * @type {Map<any, RDOMElement>}
         */
        this.elements = new Map();
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
     * This function needs a reference object so that it can find and update existing elements for any given object.
     * @param {any} ref The reference object belonging to the element.
     * @param {number} index The index at which the element will be added. Set to undefined or -1 for unordered containers.
     * @param {function(RDOMCtx, RDOMElement, ...any) : RDOMElement} render The element renderer.
     * @returns {RDOMElement} The created / updated wrapper element.
     */
    add(ref, index, render, ...args) {
        if (this._cull.active && (index < this._cull.min || this._cull.max <= index)) {
            // Out of bounds - remove if existing, don't add.
            this.removeRef(ref);
            return null;
        }

        // Check if we already added an element for ref.
        // If so, update it. Otherwise create and add a new element.
        let el = this.elements.get(ref);
        if (el) {
            let elOld = el;
            el = render(this, el, ...args);
            if (elOld !== el)
                this.container.replaceChild(el, elOld);

        } else {
            el = render(this, null, ...args);
            this.container.appendChild(el);
        }

        if (typeof(index) === "number" &&
            index > -1) {
            // Move the element to the given index.
            rdom.move(el, index + this._cull.offset);
        }

        // Register the element as "added:" - It's not a zombie and won't be removed on cleanup.
        this.added.push(el);
        // Register the element as the element of ref.
        this.references.set(el, ref);
        this.elements.set(ref, el);
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
        // Remove the element from the DOM.
        el.remove();
    }

    /**
     * Remove an element from this context, both the element in the DOM and all references in RDOM.
     * @param {RDOMElement} el The element to remove.
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
        this._genID = 0;
        this.rd$ = this.rd$.bind(this);
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

    /** Escapes the string into a HTML - safe format. */
    escapeHTML(m) {
        if (!m)
            return m;

        var n = "";
        for (var i = 0; i < m.length; i++) {
            var c = m[i];

            if (c === "&")
                n += "&amp;";
            else if (c === "<")
                n += "&lt;";
            else if (c === ">")
                n += "&gt;";
            else if (c === "\"")
                n += "&quot;";
            else if (c === "'")
                n += "&#039;";
            else
                n += c;
        }
        
        return n;
    }

    /** Escapes the string into a HTML attribute - safe format. */
    escapeAttr(m) {
        if (!m)
            return m;

        var n = "";
        for (var i = 0; i < m.length; i++) {
            var c = m[i];
            // This assumes that all attributes are wrapped in '', never "".
            if (c === "'")
                n += "&#039;";
            else
                n += c;
        }
        
        return n;
    }

    /** Generates an unique ID. */
    genID() {
        return `rdom-id-${++this._genID}`;
    }

    /**
     * Parse a template string into a HTML element, escaping expressions unprefixed with $, inserting attribute arrays and preserving child nodes.
     * @param {TemplateStringsArray} template
     * @param {...any} values
     * @returns {RDOMElement}
     */
    rd$(template, ...values) {
        try {
            let placeheld = [];
            /** @type {function(RDOMElement)} */
            let postprocessor = undefined;
            let ids = {};
            let html = template.reduce((prev, next, i) => {
                let val = values[i - 1];

                if (prev[prev.length - 1] === "$") {
                    // Keep value as-is.
                    prev = prev.slice(0, -1);
                    return prev + val + next;
                }

                if (prev[prev.length - 1] === ":") {
                    // Command.
                    prev = prev.slice(0, -1);
                    if (val.startsWith("id:")) {
                        let idKey = val.slice(3);
                        val = ids[idKey];
                        if (!val)
                            val = ids[idKey] = rdom.genID();
                    }
                }
                
                if (prev[prev.length - 1] === ">" && val instanceof Function) {
                    // Postprocessor.
                    prev = prev.slice(0, -1);
                    postprocessor = val;
                    val = "";

                } else if (prev[prev.length - 1] === "?") {
                    // Settable / gettable field.
                    prev = prev.slice(0, -1);
                    val = `<rdom-field rdom-field-key="${this.escapeAttr(val)}"></rdom-field>`;

                } else if (val instanceof Node) {
                    // Replace elements with placeholders, which will be replaced later on.
                    placeheld[placeheld.length] = val;
                    val = "<rdom-placeholder></rdom-placeholder>";
                
                } else if (prev[prev.length - 1] === "=") {
                    // Escape attributes.
                    if (val instanceof Array)
                        val = val.join(" ");
                    val = `"${this.escapeAttr(val)}"`;

                } else {
                    // Escape HTML.
                    val = this.escapeHTML(val);
                }
                return prev + val + next;
            });

            var tmp = document.createElement("template");
            tmp.innerHTML = html;
            /** @type {RDOMElement} */
            // @ts-ignore
            let el = new RDOMElement(tmp.content.firstElementChild);

            el.rdomReplacePlaceholders(placeheld);

            return postprocessor ? postprocessor(el) || el : el;
        } catch (e) {
            console.error("[rdom]", "rd$ failed parsing", String.raw(template, values), e);
            throw e;
        }
    }

}

const rdom = window["rdom"] = new RDOM();
const rd$ = window["rd$"] = rdom.rd$;
