//@ts-check

// Work around @ts-check not knowing about globals.
var jsyaml = jsyaml; // js-yaml
var componentHandler = componentHandler; // mdl

/**
 * @param {CogwheelMetaStringDef} ref
 * @param {RDOMElement} el
 */
cogwheel.renderers[CogwheelMetaStringDef.name] = (ctx, el, ref, v) => {
    el = el ||
        rd`<div class="mdl-textfield mdl-js-textfield">
            <input type="text" class="mdl-textfield__input">
        </div>`;
    
    let input = el.getElementsByTagName("input")[0];
    input.value = v;
    input.placeholder = ref.fallback;
    
    return el;
}

/**
 * @param {CogwheelMetaBooleanDef} ref
 * @param {RDOMElement} el
 */
cogwheel.renderers[CogwheelMetaBooleanDef.name] = (ctx, el, ref, v) => {
    el = el ||
        rd`<label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect">
            <input type="checkbox" class="mdl-checkbox__input">
        </label>`;
    
    let input = el.getElementsByTagName("input")[0];
    input.checked = v;
    
    return el;
}
