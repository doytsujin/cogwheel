//@ts-check
/* yasync - generator / yield* async
 * Because MS Edge lacks async in the year 2018...
 * ... or rather because some people still use Edge from 2016 in 2018.
 */

 /**
  * Run a generator function, faking async.
  * @param {Generator | function() : Generator} gen The generator, or a function returning the generator.
  * @param {any} this If gen is a function returning the generator: The context in which the generator will run in.
  * @param {...any} args If gen is a function returning the generator: Any arguments passed to the function.
  * @returns A promise.
  */
function yasync() {
    let gen = arguments[0];
    if (gen instanceof Function) {
        let args = Array.from(arguments);
        args.splice(0, 2);
        gen = arguments[0].apply(arguments[1], args);
    }

    if (!gen || !gen.next)
        throw new Error("yasync didn't receive a generator");

    return new Promise((resolve, reject) => {
        let p = Promise.resolve();
        /** @type {IteratorResult<any>} */
        let genr;

        let step = pr => {
            try {
                genr = gen.next(pr);
            } catch (e) {
                console.error("[yasync]", "Uncatched:", e);
                reject(e);
                return;
            }
            if (genr.done) {
                resolve(pr);
                return;
            }
    
            if (genr.value instanceof Promise)
                p = genr.value;
            p = p.then(step, reject);
        }
        p.then(step, reject);
    });
}
