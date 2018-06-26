//@ts-check

// Work around @ts-check not knowing about globals.
var jsyaml = jsyaml; // js-yaml
var mdc = mdc; // mdc

// TODO: Nestable CogwheelMetaDef renderer.

/**
 * @param {RDOMCtx} ctx
 * @param {CogwheelMetaStringDef} def
 * @param {RDOMElement} el
 */
cogwheel.renderers[CogwheelMetaStringDef.name] = (ctx, el, def, v) => {
    el = el ||
    rd$`<div class="input-wrap">
            <div class="input input-entry mdc-text-field">
                <input id=:${"id:input"} type="text" class="mdc-text-field__input">
                <label for=:${"id:input"}class="mdc-floating-label"></label>
                <div class="mdc-line-ripple"></div>
            </div>
        </div>
        >${inputEl => {
            inputEl.MDCTextField = new mdc.textField.MDCTextField(inputEl);
            inputEl.addEventListener("input", e => ctx["onchange"][def.path](e, def, e.target.value), false);
        }}`;
    
    let input = el.getElementsByTagName("input")[0];
    input.value = v;

    return el;
}

/**
 * @param {RDOMCtx} ctx
 * @param {CogwheelMetaBooleanDef} def
 * @param {RDOMElement} el
 */
cogwheel.renderers[CogwheelMetaBooleanDef.name] = (ctx, el, def, v) => {
    el = el ||
    rd$`<div class="input-wrap mdc-form-field">
            <div class="input input-entry mdc-checkbox">
                <input id=:${"id:input"} type="checkbox" class="mdc-checkbox__native-control"/>
                <div class="mdc-checkbox__background">
                    <svg class="mdc-checkbox__checkmark" viewBox="0 0 24 24">
                        <path class="mdc-checkbox__checkmark-path" fill="none" d="M1.73,12.91 8.1,19.28 22.79,4.59"/>
                    </svg>
                    <div class="mdc-checkbox__mixedmark"></div>
                </div>
            </div>
            <label for=:${"id:input"}>Enabled</label>
        </div>
        >${fieldEl => {
            let field = fieldEl.MDCFormField = new mdc.formField.MDCFormField(fieldEl);
            let inputEl = fieldEl.getElementsByClassName("input")[0];
            let input = inputEl.MDCCheckbox = new mdc.checkbox.MDCCheckbox(inputEl);
            field.input = input;
            inputEl.addEventListener("change", e => ctx["onchange"][def.path](e, def, e.target.checked), false);
        }}`;
    
    let input = el.getElementsByTagName("input")[0];
    input.checked = v === "" ? def.fallback : v === true;
    
    return el;
}


/**
 * @param {RDOMCtx} parentCtx
 * @param {CogwheelMetaChoiceDef} def
 * @param {RDOMElement} listEl
 */
cogwheel.renderers[CogwheelMetaChoiceDef.name] = (parentCtx, listEl, def, v) => {
    let listCtx = new RDOMContainer(listEl = listEl || rd$`<ul class="input-wrap"></ul>`).rdomCtx;
    let name = def.path.join(".");

    for (let i in def.values)
        // @ts-ignore
        listCtx.add(def.values[i], i, (ctx, el) => {
            el = el ||
            rd$`<div class="input-entry mdc-form-field">
                    <div class="input mdc-radio">
                        <input id=:${"id:input"} class="mdc-radio__native-control" type="radio" name=${name}>
                        <div class="mdc-radio__background">
                            <div class="mdc-radio__outer-circle"></div>
                            <div class="mdc-radio__inner-circle"></div>
                        </div>
                    </div>
                    <label for=:${"id:input"}>${def.values[i]}</label>
                </div>
                >${fieldEl => {
                    let field = fieldEl.MDCFormField = new mdc.formField.MDCFormField(fieldEl);
                    let inputEl = fieldEl.getElementsByClassName("input")[0];
                    let input = inputEl.MDCRadio = new mdc.radio.MDCRadio(inputEl);
                    field.input = input;
                    inputEl.addEventListener("change", e => {
                        if (!e.target.checked)
                            return;
                        parentCtx["onchange"][def.path](e, def, def.values[i]);
                    }, false);
                }}`;
            
            let input = el.getElementsByTagName("input")[0];
            input.checked = v === "" ? def.fallback : v === def.values[i];
            
            return el;
        });
    
    listCtx.cleanup();
    return listEl;
}
