//@ts-check
/* yasync - generator / yield* async
 * Because MS Edge lacks async in the year 2018...
 * ... or rather because some people still use Edge from 2016 in 2018.
 */

 /**
  * Run a generator function, faking async.
  * @param {any} this If gen is a function returning the generator: The context in which the generator will run in.
  * @param {...any} args The generator, or a function returning the generator. If gen is a function returning the generator: Any arguments passed to the function preceed the function itself.
  * @returns A promise.
  */
 const yasync = function() {
    let gen = arguments[arguments.length - 1];
    if (gen instanceof Function) {
        let self = arguments[0];
        let args = Array.from(arguments);
        args.splice(0, 1); // Remove this
        args.splice(args.length - 1, 1); // Remove gen
        gen = gen.apply(self, args);
    }

    // @ts-ignore gen is a Generator.
    if (!gen || !gen.next)
        throw new Error("yasync didn't receive a generator");

    return new Promise((resolve, reject) => {
        let p = Promise.resolve();
        /** @type {IteratorResult<any>} */
        let genr;

        let step = pr => {
            try {
                // @ts-ignore gen is a Generator.
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
    
            if (genr.value.then instanceof Function)
                p = genr.value;
            p = p.then(step, reject);
        }
        p.then(step, reject);
    });
}
