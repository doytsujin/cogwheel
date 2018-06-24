//@ts-check

// Work around @ts-check not knowing about globals.
var jsyaml = jsyaml;

class CogwheelSession {
    constructor(yamlText) {
        this.yamlText = yamlText || "";
        this._yamlTextLast = null;
        this._yamlObjLast = {};
    }

    get yamlObj() {
        if (this._yamlTextLast === this.yamlText)
            return this._yamlObjLast;
        this._yamlObjLast = jsyaml.load(this._yamlTextLast = this.yamlText);
    }
}

class Cogwheel {
    constructor() {
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

        // Load example.
        // TODO: Resume last session instead.
        this.loadSessionRemote("examples/Default.meta.yaml");
        this._session = new CogwheelSession();
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
        return fasync(
            () => {
                this.session = new CogwheelSession(`Loading: "${url}"`);
            }, /*await */ () => lazyman.load(url, "", "txt"), text => {
                this.session = new CogwheelSession(text);
            }
        );
    }

    /**
     * 
     * @param {string} text The .meta.yaml in text format.
     */
    loadMeta(text) {
        
    }

}

var cogwheel = window["cogwheel"] = new Cogwheel();
