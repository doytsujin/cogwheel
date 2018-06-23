//@ts-check
class Cogwheel {
    constructor() {
        this.main = document.getElementById("main");
        this.mainEditor = document.getElementById("main-editor");
        this.mainDivider = document.getElementById("main-divider");
        this.mainYaml = document.getElementById("main-yaml");
        this.mainYaml.addEventListener("submit", () => false, false);

        this.registerDividerH(this.mainEditor, this.mainDivider);
    }

    /**
     * @param {HTMLElement} main
     * @param {HTMLElement} divider
     */
    registerDividerH(main, divider) {
        let isDraggingDivider = false;
        let dragStart;
        let lastWidth = main.getBoundingClientRect().width;
        let width;

        main.style.width = `${lastWidth}px`;
        main.style.flexGrow = "0";

        document.addEventListener("mousedown", e => {
            if (!(isDraggingDivider = e.target === divider))
                return;
            e.preventDefault();
            
            divider.classList.add("dragging");
            dragStart = e.pageX;
        });
        
        document.addEventListener("mousemove", e => {
            if (!isDraggingDivider)
                return;
            e.preventDefault();

            width = lastWidth + e.pageX - dragStart;
            
            main.style.width = `${width}px`;
        });
        
        document.addEventListener("mouseup", e => {
            if (isDraggingDivider)
                e.preventDefault();
            divider.classList.remove("dragging");
            isDraggingDivider = false;
            lastWidth = width;
        });
    }

}

var cogwheel = window["cogwheel"] = new Cogwheel();
