//@ts-check
(async () => {
    console.log("[cogwheel.boot]", "Loading Cogwheel and all dependencies.");

    lazyman.prefixes["css"] = "./css/";
    lazyman.prefixes["js"] = "./js/";

    // Core dependencies.
    await lazyman.all([
        "rdom.js",

        // https://github.com/nodeca/js-yaml
        "ext/js-yaml.min.js",

        // https://materializecss.com/
        "https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0-beta/css/materialize.min.css",
        "https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0-beta/js/materialize.min.js",

        // https://highlightjs.org/
        [ "highlight/default.css", "ext/highlight/default.css"],
        "ext/highlight.pack.js",

        "cogwheel.css",
        "cogwheel.utils.js",
    ]);
    console.log("[cogwheel.boot]", "Core dependencies loaded.");

    // Cogwheel and other weak dependencies.
    await lazyman.all([
        "cogwheel.js",
    ]);

    console.log("[cogwheel.boot]", "Cogwheel loaded.");
})();
