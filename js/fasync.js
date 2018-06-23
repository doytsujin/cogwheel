//@ts-check

/* fasync - fake async
 * Because MS Edge lacks async in the year 2018...
 * ... or rather because some people still use Edge from 2016 in 2018.
 */

 /**
  * @param {...(function | Promise)} args
  */
var fasync = function(/* numbers */) {
    let p = Promise.resolve();
    for (let i = 0; i < arguments.length; i++) {
        let v = arguments[i];
        if (v instanceof Promise) {
            p = v;
            continue;
        }
        p = p.then(v);
    }
    return p;
}
