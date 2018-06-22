//@ts-check
class Cogwheel {

    constructor() {
        this.main = document.getElementById("main");
        this.mainEditor = document.getElementById("main-editor");
        this.mainDivider = document.getElementById("main-divider");
        this.mainYaml = document.getElementById("main-yaml");
        this.mainYaml.addEventListener("submit", () => false, false);

        this.registerDivider();
    }

    registerDivider() {
        let isDraggingDivider = false;

        document.addEventListener("mousedown", e => {
            if (!(isDraggingDivider = e.target === this.mainDivider))
                return;
            
            e.preventDefault();            
        });
        
        document.addEventListener("mousemove", e => {
            if (!isDraggingDivider)
                return;
            
            e.preventDefault();
            this.mainEditor.style.width = `${((e.clientX - this.main.offsetLeft) - 4 / 2)}px`;
            this.mainEditor.style.flexGrow = "0";
        });
        
        document.addEventListener("mouseup", e => {
            if (isDraggingDivider)
                e.preventDefault();
            isDraggingDivider = false;
        });
    }

}

/** @type {Cogwheel} */
var cogwheel = null;
lazyman.load("DOM").then(() => {
    cogwheel = window["cogwheel"] = new Cogwheel();
    setTimeout(() => document.getElementById("splash").classList.add("hidden"), 300);
});

