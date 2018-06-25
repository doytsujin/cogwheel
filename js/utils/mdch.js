//@ts-check
/* mdch - MDC helper
 */

const mdch = {

    /**
     * @param {HTMLButtonElement} btn
     */
    openMenu: function(btn) {
        let menu = btn.parentElement.getElementsByClassName("mdc-menu")[
            Array.prototype.slice.call(
                btn.parentElement.getElementsByClassName("mdc-menu-btn")
            ).indexOf(btn)
        ]["MDCMenu"];
        menu.open = !menu.open;
    }

}
