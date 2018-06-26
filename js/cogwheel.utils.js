// MS Edge from 2016 lacks this.
String.prototype.trimEnd = String.prototype.trimEnd || String.prototype.trimRight || function() {
    let end = this.length - 1;
    for (; end > -1 && this[end].trim().length === 0; --end);
    return this.slice(0, end);
};

/**
 * @param {HTMLElement} left
 * @param {HTMLElement} right
 * @param {HTMLElement} divider
 * @param {function} [cb]
 */
function registerDividerH(left, right, divider, cb) {
    let isDraggingDivider = false;
    let dragStart;
    let parentOffs;
    let parentSize;

    left.style.width = `${left.getBoundingClientRect().width}px`;
    left.style.flexGrow = "0";
    right.style.width = `${right.getBoundingClientRect().width}px`;
    right.style.flexGrow = "0";

    document.addEventListener("mousedown", e => {
        if (!(isDraggingDivider = e.target === divider))
            return;
        e.preventDefault();
        
        parentOffs = left.parentElement.clientLeft;
        parentSize = left.parentElement.clientWidth;

        divider.classList.add("dragging");
        dragStart = e.pageX;
    }, false);
    
    document.addEventListener("mousemove", e => {
        if (!isDraggingDivider)
            return;
        e.preventDefault();
        
        left.style.width = `${100 * e.pageX / parentSize}%`;
        right.style.width = `${100 - 100 * e.pageX / parentSize}%`;
        
        if (cb)
            cb();
    }, false);

    if (cb)
        window.addEventListener("resize", e => cb(), false);
    
    document.addEventListener("mouseup", e => {
        if (isDraggingDivider)
            e.preventDefault();
        divider.classList.remove("dragging");
        isDraggingDivider = false;
    }, false);
}