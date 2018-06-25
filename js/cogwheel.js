//@ts-check

// Work around @ts-check not knowing about globals.
var jsyaml = jsyaml; // js-yaml
var mdc = mdc; // mdc

class CogwheelSession {
    /**
     * @param {Cogwheel} cogwheel
     * @param {CogwheelMetaFormat} format
     * @param {string} [yamlText]
     */
    constructor(cogwheel, format, yamlText) {
        this.cogwheel = cogwheel;
        this.format = format;

        this.yamlText = yamlText || "";
        if (!this.yamlText && format)
            this.yamlText = format.example;        
    }

    get yamlObj() {
        if (this._yamlTextLast === this.yamlText)
            return this._yamlObjLast;
        return this._yamlObjLast = jsyaml.safeLoad(this._yamlTextLast = this.yamlText);
    }

    render(editorCtx) {
        /**
         * @param {RDOMCtx} ctx
         * @param {any} defs
         * @param {any} values
         */
        let crawl = (ctx, defs, values) => {
            for (let key in defs) {
                /** @type {CogwheelMetaDef} */
                let def = defs[key];

                let el = ctx.add(def.path, -1, (ctx, propEl) => {
                    propEl = propEl ||
                    rd$`<div class="property">
                            <h3 class="key mdc-typography--subtitle1">${key}:</h3>
                            ${def.comment ? rd$`<p class="description mdc-typography--body2">${def.comment}</p>` : ``}
                            ?${"input"}
                        </div>`;
                    
                    let input = this.cogwheel.render(
                        def, ctx, propEl.rdomGet("input"),
                        values[key], /* TODO: Handler */ null
                    );
                    propEl.rdomSet({
                        "input": input
                    });

                    return propEl;
                });

                try {
                    // for (let inputEl of el.getElementsByClassName("input"))
                        // componentHandler.upgradeElement(inputEl);
                } catch (e) {
                    // Probably already upgraded.
                }
            }
        }

        crawl(editorCtx, this.format.defs, this.yamlObj);
        editorCtx.cleanup();
    }
}

class Cogwheel {
    constructor() {
        this.formats = {};
        this.renderers = {};

        // Initialize the divider before anything else to prevent the layout from changing.
        registerDividerH(document.getElementById("extra"), document.getElementById("extra-divider"), true, () => {
            this.monacoEditor.layout();
        });

        // Initialize Monaco editor.
        this.monacoModel = monaco.editor.createModel(``, "yaml");
        this.monacoEditor = monaco.editor.create(document.getElementById("code"), {
            model: this.monacoModel
        });

        // Initialize our own custom elements.
        this.editorCtx = new RDOMContainer(document.getElementById("editor")).rdomCtx;
    }

    load() {
        return yasync(this, function*() {
            let splash = document.getElementById("splash");
            let splashProgressBar = document.getElementById("splash-progress-bar");

            let loaded = new Set();
            let failed = new Set();

            let formatDeps = [
                "formats/MapMeta.yaml",
            ];
            let deps = [
                "renderers/meta.js",
            ];
            let depsLength = formatDeps.length + deps.length;
    
            // Update the splash screen's progress bar.
            let updateProgress = (id, success) => {
                console.log("[cogwheel]", id, success ? "loaded." : "failed loading!");
                (success ? loaded : failed).add(id);
                if (!success) {
                    splash.classList.add("failed");
                    splashProgressBar.style.transform = `scaleX(1)`;
                    return;
                }
                splashProgressBar.style.transform = `scaleX(${loaded.size / depsLength * 0.5 + 0.5})`;
            }
    
            // Wrapper around lazyman.all which runs updateProgress.
            let load = (deps, ordered) => lazyman.all(
                deps, ordered,
                id => updateProgress(id, true),
                id => updateProgress(id, false)
            );

            let formats = yield load(formatDeps);
            for (let i in formats) {
                let id = formatDeps[i];
                id = id.slice(id.lastIndexOf("/") + 1);
                id = id.slice(0, id.length - 5);
                this.formats[id] = new CogwheelMetaFormat(id, formats[i]);
            }

            yield load(deps);

            mdc.autoInit();

            // Load example.
            // TODO: Resume last session instead.
            this.session = new CogwheelSession(this, this.formats["MapMeta"]);
        });
    }

    get session() {
        return this._session;
    }
    set session(value) {
        this._session = value;
        this.monacoModel = monaco.editor.createModel(this._session.yamlText, "yaml");
        this.monacoModel.onDidChangeContent(event => {
            this.session.yamlText = this.monacoModel.getValue();
            this.renderRoot();
        });
        this.monacoEditor.setModel(this.monacoModel);
        this.renderRoot();
    }

    initSessionFromRemoteDoc(format, url) {
        this.session = new CogwheelSession(this, null, `Loading: "${url}"`);
        return yasync(this, function*() {
            let text = yield lazyman.load(url, "", "txt");
            return this.session = new CogwheelSession(this, format, text);
        });
    }

    renderRoot() {
        this.session.render(this.editorCtx);
    }

    /**
     * @returns {RDOMElement}
     */
    render(ref, ctx, el, ...args) {
        if (!ref)
            return null;
        let render = this.renderers[ref.constructor.name];
        if (!render)
            return rd$`<span>[Missing: ${ref.constructor.name}]</span>`;
        return render(ctx, el, ref, ...args);
    }

}

const cogwheel = window["cogwheel"] = new Cogwheel();
