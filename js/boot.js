//@ts-check
(() => {
    console.log("[cogwheel.boot]", "Loading Cogwheel and all dependencies.");

    /** @type {any[]} */
    let deps = [
        "rdom.js",

        // https://github.com/nodeca/js-yaml
        "ext/js-yaml.min.js",

        // https://highlightjs.org/
        [ "highlight/default.css", "ext/highlight/default.css"],
        "ext/highlight.pack.js",

        "cogwheel.css",
        "cogwheel.utils.js",
    ];
    /** @type {any[]} */
    let core = [
        "cogwheel.js",
    ];

    /** @type {Set<string>} */
    let loaded = new Set();
    /** @type {Set<string>} */
    let failed = new Set();

    /** @type {HTMLElement} */
    let splash;
    /** @type {HTMLElement} */
    let splashProgressBar;

    // Update the splash screen's progress bar.
    let updateProgress = (id, success) => {
        console.log("[cogwheel.boot]", id, success ? "loaded." : "failed loading!");
        (success ? loaded : failed).add(id);
        splashProgressBar.style.transform = `scaleX(${loaded.size / (deps.length + core.length)})`;
    }

    // Wrapper around lazyman.all which runs updateProgress.
    let load = deps => lazyman.all(
        deps,
        // Resolve
        id => updateProgress(id, true),
        // Reject
        id => updateProgress(id, false)
    );

    fasync(() => {
        console.log("[cogwheel.boot]", "Waiting until DOM ready.");
    }, /*async*/ () => lazyman.load("DOM"), () => {
        console.log("[cogwheel.boot]", "DOM ready.");

        splash = document.getElementById("splash");
        splashProgressBar = document.getElementById("splash-progress-bar");
    
        lazyman.prefixes["css"] = "./css/";
        lazyman.prefixes["js"] = "./js/";

    }, /*async*/ () => load(deps), () => {
        console.log("[cogwheel.boot]", "Core dependencies loaded.");

    }, /*async*/ () => load(core), () => {
        console.log("[cogwheel.boot]", "Cogwheel loaded.");

        window["hljs"].initHighlightingOnLoad();

        setTimeout(() => {
            splash.classList.add("hidden");
        }, 200);
        setTimeout(() => {
            splash.remove();
        }, 1000);
    });
})();
