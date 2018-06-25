// MS Edge from 2016 lacks this.
String.prototype.trimEnd = String.prototype.trimEnd || String.prototype.trimRight || function() {
    let end = this.length - 1;
    for (; end > -1 && this[end].trim().length === 0; --end);
    return this.slice(0, end);
};

/**
 * @param {HTMLElement} main
 * @param {HTMLElement} divider
 * @param {boolean} [flip]
 * @param {function} [cb]
 */
function registerDividerH(main, divider, flip, cb) {
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
        if (cb)
            cb();
    });
    
    document.addEventListener("mouseup", e => {
        if (isDraggingDivider)
            e.preventDefault();
        divider.classList.remove("dragging");
        isDraggingDivider = false;
    });
}