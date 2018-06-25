//@ts-check

// Work around @ts-check not knowing about globals.
var jsyaml = jsyaml; // js-yaml
var mdc = mdc; // mdc

// TODO: Move renderers away from metas.

class CogwheelMetaDef {
    constructor(path, comment, fallback) {
        this.path = path;
        this.comment = comment;
        this.fallback = fallback;
    }

    render(ctx, el, value) {
        if (typeof(value) === "undefined" ||
            value === null)
            return rd$`<span>${value}</span>`;
        return rd$`<span>${value.constructor.name}: ${value}</span>`;
    }
}

class CogwheelMetaStringDef extends CogwheelMetaDef {
    constructor(path, comment, fallback) {
        super(path, comment, fallback);
    }
}

class CogwheelMetaChoiceDef extends CogwheelMetaDef {
    constructor(path, comment, fallback, values) {
        super(path, comment, fallback);
        this.values = values;
    }
}

class CogwheelMetaBooleanDef extends CogwheelMetaDef {
    constructor(path, comment, fallback) {
        super(path, comment, fallback);
    }
}

class CogwheelMetaFormat {
    constructor(id, input) {
        this.id = id;
        this.input = input;
        this.defs = {};

        let crawl = (parent, input, defs) => {
            for (let key in input) {
                if (key[0] === "_")
                    continue;
                let path = [...parent, key];

                /** @type {CogwheelMetaDef} */
                let def = null;

                let comment = input[`_${key}`];
                
                let value = input[key];
                if (value instanceof Array) {
                    if (value.length === 0) {
                        // TODO: custom lists
                    } else {
                        // List of choices.
                        for (let i in value) {
                            let v = value[i];
                            if (typeof(v) === "string" &&
                                v[v.length - 1] === "*") {
                                v = v.slice(0, -1);
                                value[i] = v;
                                def = new CogwheelMetaChoiceDef(path, comment, v, value);
                                break;
                            }
                        }
                    }
                
                } else if (typeof(value) === "boolean") {
                    def = new CogwheelMetaBooleanDef(path, comment, value);

                } else {
                    // Fallback: Text.
                    def = new CogwheelMetaStringDef(path, comment, value);
                }

                defs[key] = def;
            }
        }
        crawl([], this.input, this.defs);

        this.example = this.buildText();
    }

    buildText(values) {
        let text = "";

        let toComment = s => `# ${(s.trimEnd()+"\n").split("\n").join("\n# ").slice(0, -3)}\n`;

        if (this.input["_"]) {
            text += toComment(this.input["_"]);
            text += "\n";
        }

        let crawl = (defs, values) => {
            for (let key in defs) {
                /** @type {CogwheelMetaDef} */
                let def = defs[key];
                
                let value = undefined;
                if (typeof(values) !== "undefined" && typeof(values[key]) !== "undefined")
                    value = values[key];
                else if (def.fallback !== "undefined")
                    value = def.fallback;
                if (typeof(value) === "undefined")
                    continue;

                if (def.comment)
                    text += toComment(def.comment);

                let dump = {};
                dump[key] = value;
                text += jsyaml.safeDump(dump);
                text += "\n";
            }
        }

        crawl(this.defs, values);

        return text;
    }
}
