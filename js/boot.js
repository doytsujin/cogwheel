//@ts-check
yasync(function*() {
    console.log("[boot]", "Waiting until DOM ready.");
    yield lazyman.load("DOM");
    console.log("[boot]", "DOM ready.");
        
    let splash = document.getElementById("splash");
    let splashProgressBar = document.getElementById("splash-progress-bar");

    lazyman.prefixes[""] = "./";
    lazyman.prefixes["css"] = "./css/";
    lazyman.prefixes["js"] = "./js/";

    let monacoVS = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.13.1/min/vs";

    let loaded = new Set();
    let failed = new Set();

    let deps = [
        "utils/rdom.js",

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
    let core = [
        "cogwheel.js",
    ];
    let depsLength = deps.length + core.length;

    // Update the splash screen's progress bar.
    let updateProgress = (id, success) => {
        console.log("[boot]", id, success ? "loaded." : "failed loading!");
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

    console.log("[boot]", "Loading Cogwheel and all dependencies.");
    yield load(deps);
    console.log("[boot]", "Base dependencies loaded.");

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
    console.log("[boot]", "MonacoEnvironment set up.");

    yield new Promise((resolve, reject) => {
        // @ts-ignore
        require(["vs/editor/editor.main"], () => resolve());
    });
    console.log("[boot]", "Monaco loaded.");

    yield load(core);
    console.log("[boot]", "Cogwheel prepared.");

    yield cogwheel.load();
    console.log("[boot]", "Cogwheel loaded.");

    splash.classList.add("hidden");
    setTimeout(() => {
        splash.remove();
    }, 1000);

}).catch(e => {
    document.getElementById("splash").classList.add("failed");
    throw e;
});
