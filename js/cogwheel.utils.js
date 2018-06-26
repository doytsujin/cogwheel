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
    let leftLastWidth;
    let rightLastWidth;

    left.style.width = `${left.getBoundingClientRect().width}px`;
    left.style.flexGrow = "0";
    right.style.width = `${right.getBoundingClientRect().width}px`;
    right.style.flexGrow = "0";

    document.addEventListener("mousedown", e => {
        if (!(isDraggingDivider = e.target === divider))
            return;
        e.preventDefault();
        
        leftLastWidth = left.getBoundingClientRect().width;
        rightLastWidth = right.getBoundingClientRect().width;
        divider.classList.add("dragging");
        dragStart = e.pageX;
    });
    
    document.addEventListener("mousemove", e => {
        if (!isDraggingDivider)
            return;
        e.preventDefault();

        left.style.width = `${leftLastWidth + e.pageX - dragStart}px`;
        right.style.width = `${rightLastWidth - e.pageX + dragStart}px`;
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