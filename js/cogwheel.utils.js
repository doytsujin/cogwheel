// Escapes the string into a HTML - safe format.
function escapeHTML(m) {
    if (!m)
      return m;

    var n = "";
    for (var i = 0; i < m.length; i++) {
        var c = m[i];

        if (c === "&")
            n += "&amp;";

        else if (c === "<")
            n += "&lt;";

        else if (c === ">")
            n += "&gt;";

        else if (c === "\"")
            n += "&quot;";

        else if (c === "'")
            n += "&#039;";
          
        else
            n += c;
    }
    
    return n;
}

// Escapes the string into a HTML attribute - safe format.
function escapeAttr(m) {
    if (!m)
        return m;

    var n = "";
    for (var i = 0; i < m.length; i++) {
        var c = m[i];
        // This assumes that all attributes are wrapped in '', never "".
        if (c === "'")
            n += "&#039;";
        else
          n += c;
    }
    
    return n;
}

function genCall() {
    var f = arguments[0];
    var args = Array.from(arguments);
    args.splice(0, 1);
    return () => f.apply(this, args);
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