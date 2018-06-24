//@ts-check

// Work around @ts-check not knowing about globals.
var M = M;

class Cogwheel {
    constructor() {
        this.elEditor = document.getElementById("editor");
        this.elExtra = document.getElementById("extra");
        this.elExtraDivider = document.getElementById("extra-divider");
        this.elCode = document.getElementById("code");

        // Initialize the divider before anything else to prevent the layout from changing.
        this.registerDividerH(this.elExtra, this.elExtraDivider, true);

        // Initialize Monaco editor.
        this.monacoModel = monaco.editor.createModel("", "yaml");
        this.monacoEditor = monaco.editor.create(this.elCode, {
            model: this.monacoModel
        });

        // Initialize our own custom elements.
        // ...
    }

    /**
     * @param {HTMLElement} main
     * @param {HTMLElement} divider
     */
    registerDividerH(main, divider, flip) {
        let isDraggingDivider = false;
        let dragStart;
        let lastWidth;

        main.style.width = `${main.getBoundingClientRect().width}px`;
        main.style.flexGrow = "0";

        document.addEventListener("mousedown", e => {
            if (!(isDraggingDivider = e.target === divider))
                return;
            e.preventDefault();
            
            lastWidth = main.getBoundingClientRect().width;
            divider.classList.add("dragging");
            dragStart = e.pageX;
        });
        
        document.addEventListener("mousemove", e => {
            if (!isDraggingDivider)
                return;
            e.preventDefault();

            main.style.width = `${lastWidth + (flip ? -1 : 1) * (e.pageX - dragStart)}px`;
            this.monacoEditor.layout();
        });
        
        document.addEventListener("mouseup", e => {
            if (isDraggingDivider)
                e.preventDefault();
            divider.classList.remove("dragging");
            isDraggingDivider = false;
        });
    }

}

var cogwheel = window["cogwheel"] = new Cogwheel();
