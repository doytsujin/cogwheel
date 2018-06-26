//@ts-check
yasync(this, function*() {
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

    let depsBase = [
        "utils/rdom.js",
        "utils/mdch.js",

        // https://github.com/nodeca/js-yaml
        "ext/js-yaml.min.js",

        // https://material.io/develop/web/docs/getting-started/
        [ "materialicons.css", "https://fonts.googleapis.com/icon?family=Material+Icons" ],
        [ "Roboto.css", "https://fonts.googleapis.com/css?family=Roboto:300,400,500,600,700" ],
        "https://unpkg.com/material-components-web@latest/dist/material-components-web.min.css",
        "https://unpkg.com/material-components-web@latest/dist/material-components-web.min.js",

        "cogwheel.css",
        "cogwheel.utils.js",
    ];
    let depsMonaco = [
        // https://github.com/Microsoft/monaco-editor/blob/master/docs/integrate-amd-cross.md
        // https://cdnjs.com/libraries/monaco-editor
        [ "monaco-editor/loader.js", monacoVS + "/loader.js" ],
    ]
    let core = [
        // Cogwheel depends on this.
        "meta.js",
        
        // Cogwheel itself.
        "cogwheel.js"
    ];
    let depsLength = depsBase.length + depsMonaco.length + core.length;

    // Update the splash screen's progress bar.
    let updateProgress = (id, success) => {
        console.log("[boot]", id, success ? "loaded." : "failed loading!");
        (success ? loaded : failed).add(id);
        if (!success) {
            splash.classList.add("failed");
            splashProgressBar.style.transform = `scaleX(1)`;
            return;
        }
        splashProgressBar.style.transform = `scaleX(${loaded.size / depsLength * 0.5})`;
    }

    // Wrapper around lazyman.all which runs updateProgress.
    let load = (deps, ordered) => lazyman.all(
        deps, ordered,
        id => updateProgress(id, true),
        id => updateProgress(id, false),
    );

    console.log("[boot]", "Loading Cogwheel and all dependencies.");
    yield load(depsBase);
    console.log("[boot]", "Base dependencies loaded.");
    // Load monaco late because it defines define.amd, which breaks jsyaml on Chrome.
    yield load(depsMonaco);
    console.log("[boot]", "Monaco loader loaded.");

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

    yield load(core, true);
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
