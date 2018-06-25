//@ts-check

// Work around @ts-check not knowing about globals.
var jsyaml = jsyaml; // js-yaml
var componentHandler = componentHandler; // mdl

class CogwheelFormat {
    constructor(id, yaml) {
        this.id = id;
        this.defs = yaml;
        this.defaults = {};

        this.example = "";

        // _*: comment

        let toComment = s => `# ${(s.trimEnd()+"\n").split("\n").join("\n# ").slice(0, -3)}\n`;

        if (yaml["_"]) {
            this.example += toComment(yaml["_"]);
            this.example += "\n";
        }

        let crawl = (defs, defaults) => {
            for (let key in defs) {
                if (key[0] === "_")
                    continue;
                
                if (defs[`_${key}`])
                    this.example += toComment(defs[`_${key}`]);
                
                let def = defs[key];
                let defValue = def;
                if (def instanceof Array) {
                    for (let i in def) {
                        let v = def[i];
                        if (typeof(v) === "string" &&
                            v[v.length - 1] === "*") {
                            v = v.slice(0, -1);
                            def[i] = v;
                            defValue = v;
                            break;
                        }
                    }
                }

                let dump = {};
                dump[key] = defaults[key] = defValue;
                this.example += jsyaml.safeDump(dump);
                this.example += "\n";
            }
        }

        crawl(this.defs, this.defaults);
    }
}

class CogwheelSession {
    /**
     * @param {CogwheelFormat} format
     * @param {string} [yamlText]
     */
    constructor(format, yamlText) {
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
}

class Cogwheel {
    constructor() {
        this.formats = {};

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
        this.editorCtx = rdom.ctx(document.getElementById("editor"));
    }

    load() {
        return yasync(function*() {
            let splash = document.getElementById("splash");
            let splashProgressBar = document.getElementById("splash-progress-bar");

            let loaded = new Set();
            let failed = new Set();

            let formatDeps = [
                "formats/MapMeta.yaml",
            ];
            let depsLength = formatDeps.length;
    
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
            let load = deps => lazyman.all(
                deps,
                id => updateProgress(id, true),
                id => updateProgress(id, false)
            );

            let formats = yield load(formatDeps);
            for (let i in formats) {
                let id = formatDeps[i];
                id = id.slice(id.lastIndexOf("/") + 1);
                id = id.slice(0, id.length - 5);
                this.formats[id] = new CogwheelFormat(id, formats[i]);
            }

            // Load example.
            // TODO: Resume last session instead.
            this.session = new CogwheelSession(this.formats["MapMeta"]);
        }, this);
    }

    get session() {
        return this._session;
    }
    set session(value) {
        this._session = value;
        this.monacoModel = monaco.editor.createModel(this._session.yamlText, "yaml");
        this.monacoModel.onDidChangeContent(event => {
            this.session.yamlText = this.monacoModel.getValue();
            this.render();
        });
        this.monacoEditor.setModel(this.monacoModel);
        this.render();
    }

    initSessionFromRemoteDoc(format, url) {
        this.session = new CogwheelSession(null, `Loading: "${url}"`);
        return yasync(function*() {
            let text = yield lazyman.load(url, "", "txt");
            return this.session = new CogwheelSession(format, text);
        });
    }

    render() {
        /**
         * @param {RDOMCtx} ctx
         * @param {any} values
         * @param {any} defs
         * @param {any} defaults
         */
        let crawl = (ctx, values, defs, defaults) => {
            for (let key in defs) {
                if (key[0] === "_")
                    continue;

                let handler = ""; // TODO
                
                let input = "";

                if (defs[key] instanceof Array) {
                    if (defs[key].length === 0) {
                        input = `<span class="input">[TODO: custom list]</span>`

                    } else {
                        input = `<span class="input">[TODO: dropdowns]</span>`
                    }

                } else if (typeof(defs[key]) === "boolean") {
                    // Toggle.
                    input =
`<label class="input mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect">
    <input type="checkbox" class="mdl-checkbox__input" ${values[key] === true ? "checked" : ""} oninput="${handler}">
</label>`;

                } else {
                    // Text (fallback).
                    input =
`<div class="input mdl-textfield mdl-js-textfield">
    <input type="text" class="mdl-textfield__input" value="${escapeAttr(values[key])}" placeholder="${escapeAttr(defaults[key])}" oninput="${handler}">
</div>`;
                }

                let html =
`<div class="property">
    <div class="head">
        <h6 class="key mdl-typography--title">${escapeHTML(key)}:</h6>${input}
    </div>
    ${defs[`_${key}`] ? `<p class="description">${escapeHTML(defs[`_${key}`])}</p>` : ``}
</div>`;

                let el = ctx.add(key, -1, html);
                try {
                    for (let inputEl of el.getElementsByClassName("input"))
                        componentHandler.upgradeElement(inputEl);
                } catch (e) {
                    // Probably already upgraded.
                }
            }
        }

        crawl(
            this.editorCtx, this.session.yamlObj,
            this.session.format.defs, this.session.format.defaults
        );
        this.editorCtx.cleanup();
    }

}

var cogwheel = window["cogwheel"] = new Cogwheel();
