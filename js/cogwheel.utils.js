encodeHTML = function(s) {
    if (!s)
        return s;
    return s
        .replace(/[\x26\x0A\<>'"]/g, c => "&#" + c[0] + ";")
        .replace("&#\n;", "<br>");
};

genCall = function() {
    var f = arguments[0];
    var args = Array.from(arguments);
    args.splice(0, 1);
    return () => f.apply(this, args);
};
genPromise = function() {
    var call = Stacks.genCall.apply(this, arguments);
    return new Promise(function(resolve, reject) {
      resolve({genPromise: "true", r: call()});
    });
};
