//@ts-check
(() => {
    console.log("[cogwheel.boot]", "Loading Cogwheel and all dependencies.");

    let monacoVS = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.13.1/min/vs";

    lazyman.prefixes[""] = "./";
    lazyman.prefixes["css"] = "./css/";
    lazyman.prefixes["js"] = "./js/";

    let deps = [
        "rdom.js",

        // https://github.com/nodeca/js-yaml
        "ext/js-yaml.min.js",

        // https://getmdl.io/
        [ "materialicons.css", "https://fonts.googleapis.com/icon?family=Material+Icons", "css" ],
        "https://code.getmdl.io/1.3.0/material.indigo-pink.min.css",
        "https://code.getmdl.io/1.3.0/material.min.js",

        // https://github.com/Microsoft/monaco-editor/blob/master/docs/integrate-amd-cross.md
        // https://cdnjs.com/libraries/monaco-editor
        [ "monaco-editor/loader.js", monacoVS + "/loader.js" ],

        "cogwheel.css",
        "cogwheel.utils.js",
    ];
    let extras = [
        // Preload the default example.
        "examples/Default.meta.yaml",
    ];
    let core = [
        "cogwheel.js",
    ];
    let depsAll = deps.length + extras.length + core.length;

    let loaded = new Set();
    let failed = new Set();

    let splash;
    let splashProgressBar;

    // Update the splash screen's progress bar.
    let updateProgress = (id, success) => {
        console.log("[cogwheel.boot]", id, success ? "loaded." : "failed loading!");
        (success ? loaded : failed).add(id);
        splashProgressBar.style.transform = `scaleX(${loaded.size / (depsAll)})`;
        if (!success) {
            splash.classList.add("failed");
        }
    }

    // Wrapper around lazyman.all which runs updateProgress.
    let load = deps => lazyman.all(
        deps,
        // Resolve
        id => updateProgress(id, true),
        // Reject
        id => updateProgress(id, false)
    );

    fasync(
        () => {
            console.log("[cogwheel.boot]", "Waiting until DOM ready.");
        }, /*await*/ () => lazyman.load("DOM"), () => {
            console.log("[cogwheel.boot]", "DOM ready.");

            splash = document.getElementById("splash");
            splashProgressBar = document.getElementById("splash-progress-bar");

        }, /*await*/ () => load(deps), () => {
            console.log("[cogwheel.boot]", "Base dependencies loaded.");

            // @ts-ignore
            require.config({ paths: { "vs": monacoVS }});
            // https://github.com/Microsoft/monaco-editor/blob/master/docs/integrate-amd-cross.md
            // Before loading vs/editor/editor.main, define a global MonacoEnvironment that overwrites
            // the default worker url location (used when creating WebWorkers). The problem here is that
            // HTML5 does not allow cross-domain web workers, so we need to proxy the instantiation of
            // a web worker through a same-domain script
            // @ts-ignore
            window.MonacoEnvironment = {
                getWorkerUrl: function(workerId, label) {
                    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
                        self.MonacoEnvironment = {
                        baseUrl: '${monacoVS}'
                        };
                        importScripts('${monacoVS}/base/worker/workerMain.js');`
                    )}`;
                }
            };
            console.log("[cogwheel.boot]", "MonacoEnvironment set up.");

        }, /*await*/ () => new Promise((resolve, reject) => {
            // @ts-ignore
            require(["vs/editor/editor.main"], function() {
                console.log("[cogwheel.boot]", "Monaco loaded.");
                resolve();
            });
        }), /*await*/ () => load(extras), () => {
            console.log("[cogwheel.boot]", "Extras loaded.");
        }, /*await*/ () => load(core), () => {
            console.log("[cogwheel.boot]", "Cogwheel prepared.");

            setTimeout(() => {
                splash.classList.add("hidden");
            }, 200);
            setTimeout(() => {
                // splash.remove();
            }, 1000);
        }
    );
})();
