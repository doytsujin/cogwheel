//@ts-check

/* LazyMan - quick and dirty dependency manager.
Best explained with the following code example:
****

// Set the default prefixes.
lazyman.prefixes["css"] = "./css/";
lazyman.prefixes["js"] = "./js/";

// Core (critical) dependencies.
await lazyman.all([
    "rdom.js", // Located inside ./js/, supports lazyman.

    // Located inside ./js/, force-register on load event.
    "js-yaml.min.js",

    // Located outside of ./css/
    "https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0-beta/css/materialize.min.css",
    // Located outside of ./js/, force-register on load event.
    "https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0-beta/js/materialize.min.js",

    // Located inside of ./css/, but the dependency ID would default to "default.css"
    // Set ID to "highlight-style/default.css", using custom lazyman.load(...) params.
    [ "highlight-style/default.css", "highlight/default.css"],
    // Located inside of ./js/, force-register on load event.
    "highlight.pack.js",

    // Located inside ./css/
    "cogwheel.css",
    // Located inside ./js/, supports lazyman.
    "cogwheel.utils.js",
]);

// main.js and other "weak" dependencies.
await lazyman.all([
    // Located inside ./js/, supports lazyman.
    "main.js",
]);

// Do something after everything finished loading, f.e. hiding the preloader / splash.
document.getElementById("splash").classList.add("hidden");
*/

class LazyMan {
    constructor() {
        /** @type {Set<string>} */
        this._loaded = new Set();
        /** @type {any} */
        this._loading = {};

        /**
         * The default prefixes for the resource types.
         * @type {any}
         */
        this.prefixes = {
            "css": "/css/",
            "js": "/js/"
        }
        
        /**
         * The default loaders for the resource types.
         * The loader functions share their params with LazyMan's load function.
         * @type {any}
         */
        this.loaders = {

        }
    }

    /**
     * Lazy-load the given resource.
     * @param {string} id The resource ID. It must match when loading scripts.
     * @param {string} [url] The resource URL.
     * Can be undefined if the resource URL is located at prefix + id.
     * @param {string} [type] The type, f.e. "js", if it doesn't match the URL ending.
     * @returns {Promise<any>} A promise returning the dependency if applicable.
     */
    load(id, url, type) {
        if (typeof(url) === "undefined" ||
            url === null ||
            url === "")
            url = id;
        
        if (typeof(type) === "undefined" ||
            type === null ||
            type === "") {
            let indexOfEnding = url.lastIndexOf(".");
            type = url.slice(indexOfEnding + 1);
        }

        let indexOfProtocol = url.indexOf("://");
        if (indexOfProtocol === -1 ||
            indexOfProtocol >= 8 &&
            this.prefixes[type])
            url = this.prefixes[type] + url;

        if (this._loaded.has(id))
            return Promise.resolve();

        if (this._loading[id])
            return this._loading[id].promise;
        
        this._loading[id] = {};
        return this._loading[id].promise = new Promise((resolve, reject) => {
            this._loading[id].resolve = resolve;
            this._loading[id].reject = reject;

            if (type === "css") {
                let style = document.createElement("link");
                style.type = "text/css";
                style.rel = "stylesheet";
                style.href = url;
                style.addEventListener("load", () => this.register(id), false);
                style.addEventListener("error", () => reject(), false);
                try {
                    document.head.appendChild(style);
                } catch (e) {
                    reject(e);
                }
                return;
            }
    
            let script = document.createElement("script");
            script.type = "text/javascript";
            script.src = url;
            script.async = true;
            script.defer = true;
            script.addEventListener("load", () => this.register(id), false);
            script.addEventListener("error", () => reject(), false);
            try {
                document.head.appendChild(script);
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Lazy-load all resources (dependencies).
     * @param {any[]} deps The dependency list, accepting either the URLs (IDs will be the file name) or the parameters when calling load.
     * @returns {Promise<any[]>} A promise.
     */
    all(deps) {
        let all = [];
        for (let dep of deps)
            if (typeof(dep) === "string") {
                let url = dep;
                let indexOfID = dep.lastIndexOf("/");
                let id = url.slice(indexOfID + 1);
                if (url[0] === "*") {
                    url = url.slice(1);
                    id = "*" + id;
                }
                all.push(this.load(id, url));
            } else {
                all.push(this.load.apply(this, dep));
            }
        return Promise.all(all);
    }

    /**
     * Register the ID as "loaded", resolving all promises waiting for it.
     * @param {string} id The ID to register as "loaded".
     */
    register(id) {
        if (this._loaded.has(id))
            return;

        console.log("[lazyman]", "Registered:", id);

        let resolve = undefined;
        if (this._loading[id])
            resolve = this._loading[id].resolve;

        this._loaded.add(id);
        this._loading[id] = undefined;

        if (resolve)
            resolve();
    }

}

var lazyman = window["lazyman"] = new LazyMan();
lazyman.register("lazyman");

if (document.readyState == "complete")
    lazyman.register("DOM");
else
    document.addEventListener("DOMContentLoaded", () => lazyman.register("DOM"), false);
