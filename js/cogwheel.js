//@ts-check

// Work around @ts-check not knowing about globals.
var hljs = hljs;

class Cogwheel {
    constructor() {
        this.main = document.getElementById("main");
        this.mainEditor = document.getElementById("main-editor");
        this.mainDivider = document.getElementById("main-divider");
        this.mainYaml = document.getElementById("main-yaml");
        this.mainCodeWrap = document.getElementById("main-yaml-code-wrap");
        this.mainYaml.addEventListener("submit", () => false, false);

        this.registerDividerH(this.mainEditor, this.mainDivider);
        this.registerCodeArea(this.mainCodeWrap);
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

    /**
     * @param {HTMLElement} codeWrap
     */
    registerCodeArea(codeWrap) {
        let wasEditing = false;
        let isEditing = false;

        document.addEventListener("click", e => {
            let target = e.target;
            while (target && target !== codeWrap)
                // @ts-ignore
                target = target.parentElement;
            wasEditing = isEditing;
            isEditing = target === codeWrap;

            if (wasEditing == isEditing)
                return;

            if (isEditing) {
                codeWrap.classList.add("editing");

                let code = codeWrap.firstElementChild;
                let codeArea = document.createElement("textarea");
                codeArea.id = code.id;
                for (let i = 0; i < code.classList.length; i++)
                    codeArea.classList.add(code.classList[i]);
                // @ts-ignore
                codeArea.value = code.innerText;
                codeWrap.replaceChild(codeArea, code);
                
            } else {
                codeWrap.classList.remove("editing");

                let codeArea = codeWrap.firstElementChild;
                let code = document.createElement("code");
                code.id = codeArea.id;
                for (let i = 0; i < codeArea.classList.length; i++)
                    code.classList.add(codeArea.classList[i]);
                // @ts-ignore
                code.innerHTML = escapeHTML(codeArea.value);
                codeWrap.replaceChild(code, codeArea);
                hljs.highlightBlock(code);
            }
        });
    }

}

var cogwheel = window["cogwheel"] = new Cogwheel();
