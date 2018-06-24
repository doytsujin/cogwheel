//@ts-check

// Work around @ts-check not knowing about globals.
var jsyaml = jsyaml;

class CogwheelFormat {
    constructor(yaml) {
        this.yaml = yaml;
        this.comments = {}

        this.example = "";

        // _*: comment

        let toComment = s => `# ${(s.trimEnd()+"\n").split("\n").join("\n# ").slice(0, -3)}\n`;

        if (yaml["_"]) {
            this.example += toComment(yaml["_"]);
            this.example += "\n";
        }

        let crawl = (yaml, comments) => {
            for (let key in yaml) {
                if (key[0] === "_")
                    continue;
                
                if (yaml[`_${key}`])
                    this.example += toComment(yaml[`_${key}`]);
                
                let def = yaml[key];
                if (def instanceof Array) {
                    for (let v of def) {
                        if (typeof(v) === "string" &&
                            v[v.length - 1] === "*") {
                            def = v.slice(0, -1);
                            break;
                        }
                    }
                }

                let dump = {};
                dump[key] = def;
                this.example += jsyaml.safeDump(dump);
                this.example += "\n";
            }
        }

        crawl(this.yaml, this.comments);
    }
}

class CogwheelSession {
    constructor(yamlText) {
        this.yamlText = yamlText || "";
        this._yamlTextLast = null;
        this._yamlObjLast = {};
    }

    get yamlObj() {
        if (this._yamlTextLast === this.yamlText)
            return this._yamlObjLast;
        this._yamlObjLast = jsyaml.safeLoad(this._yamlTextLast = this.yamlText);
    }
}

class Cogwheel {
    constructor() {
        this.formats = {};

        this.elEditor = document.getElementById("editor");
        this.elExtra = document.getElementById("extra");
        this.elExtraDivider = document.getElementById("extra-divider");
        this.elCode = document.getElementById("code");

        // Initialize the divider before anything else to prevent the layout from changing.
        registerDividerH(this.elExtra, this.elExtraDivider, true, () => {
            this.monacoEditor.layout();
        });

        // Initialize Monaco editor.
        this.monacoModel = monaco.editor.createModel(``, "yaml");
        this.monacoEditor = monaco.editor.create(this.elCode, {
            model: this.monacoModel
        });

        // Initialize our own custom elements.
        // ...
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
                this.formats[id] = new CogwheelFormat(formats[i]);
            }

            // Load example.
            // TODO: Resume last session instead.
            this.session = new CogwheelSession(this.formats["MapMeta"].example);
        }, this);
    }

    get session() {
        return this._session;
    }
    set session(value) {
        this._session = value;
        this.monacoModel = monaco.editor.createModel(this._session.yamlText, "yaml");
        this.monacoEditor.setModel(this.monacoModel);
    }

    loadSessionRemote(url) {
        this.session = new CogwheelSession(`Loading: "${url}"`);
        return yasync(function*() {
            let text = yield lazyman.load(url, "", "txt");
            return this.session = new CogwheelSession(text);
        });
    }

    /**
     * 
     * @param {string} text The .meta.yaml in text format.
     */
    loadMeta(text) {
        
    }

}

var cogwheel = window["cogwheel"] = new Cogwheel();
