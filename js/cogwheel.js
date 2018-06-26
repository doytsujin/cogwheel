//@ts-check

// Work around @ts-check not knowing about globals.
var jsyaml = jsyaml; // js-yaml
var mdc = mdc; // mdc

class CogwheelSession {
    /**
     * @param {Cogwheel} cogwheel
     * @param {CogwheelMetaFormat} format
     * @param {any} [yaml]
     */
    constructor(cogwheel, format, yaml) {
        this.cogwheel = cogwheel;
        this.format = format;

        this.rendering = 0;

        if (!yaml)
            this.yamlText = format.example;
        else if (typeof(yaml) === "string")
            this.yamlText = yaml;
        else
            this.yaml = yaml;
    }

    get yamlText() {
        return this.format.buildText(this.yaml);
    }
    set yamlText(value) {
        this.yaml = jsyaml.safeLoad(value);
    }

    renderEditor(editorCtx) {
        this.rendering++;

        /**
         * @param {RDOMCtx} ctx
         * @param {any} defs
         * @param {any} values
         */
        let crawl = (ctx, defs, values) => {
            let onchange = (ctx["onchange"] = ctx["onchange"] || {});
            for (let key in defs) {
                /** @type {CogwheelMetaDef} */
                let def = defs[key];

                // TODO: Move to nestable CogwheelMetaDef renderer.
                let el = ctx.add(def.path, -1, (ctx, propEl) => {
                    propEl = propEl ||
                    rd$`<div class="property">
                            <h3 class="key mdc-typography--subtitle1">${key}:</h3>
                            ${def.comment ? rd$`<span class="description mdc-typography--caption">${def.comment}</span>` : ``}
                            ?${"input"}
                        </div>`;
                    
                    onchange[def.path] = (e, def, v) => {
                        values[key] = v;
                        this.renderCode();
                    }
                    
                    let input = this.cogwheel.render(
                        ctx, propEl.rdomGet("input"),
                        def, values[key]
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

        crawl(editorCtx, this.format.defs, this.yaml);
        editorCtx.cleanup();

        this.rendering--;
    }

    renderCode() {
        this.rendering++;
        // TODO: diff and apply diff.
        this.cogwheel.monacoModel.setValue(this.yamlText);
        this.rendering--;
    }
}

class Cogwheel {
    constructor() {
        this.formats = {};
        this.renderers = {};

        // Initialize the divider before anything else to prevent the layout from changing.
        registerDividerH(
            document.getElementById("editor"),
            document.getElementById("extra"),
            document.getElementById("extra-divider"), 
            () => this.monacoEditor.layout()
        );

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

    /** @return {CogwheelSession} */
    get session() {
        return this._session;
    }
    set session(value) {
        this._session = value;
        this.monacoModel = monaco.editor.createModel(this._session.yamlText, "yaml");
        this.monacoModel.onDidChangeContent(e => {
            if (this.session.rendering)
                return;
            this.session.yamlText = this.monacoModel.getValue();
            this.session.renderEditor(this.editorCtx);
        });
        this.monacoEditor.setModel(this.monacoModel);
        this.session.renderEditor(this.editorCtx);
    }

    initSessionFromRemoteDoc(format, url) {
        this.session = new CogwheelSession(this, null, `Loading: "${url}"`);
        return yasync(this, function*() {
            let text = yield lazyman.load(url, "", "txt");
            return this.session = new CogwheelSession(this, format, text);
        });
    }

    /**
     * @returns {RDOMElement}
     */
    render(ctx, el, ref, ...args) {
        if (!ref)
            return null;
        let render = this.renderers[ref.constructor.name];
        if (!render)
            return rd$`<span>[Missing: ${ref.constructor.name}]</span>`;
        return render(ctx, el, ref, ...args);
    }

}

const cogwheel = window["cogwheel"] = new Cogwheel();
