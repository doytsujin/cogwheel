// Escapes the string into a HTML - safe format.
function escapeHTML(m) {
  if (!m)
    return m;

  var n = "";
  for (var i = 0; i < m.length; i++) {
    var c = m[i];
    if (c === "&") { n += "&amp;"; continue; }
    if (c === "<") { n += "&lt;"; continue; }
    if (c === ">") { n += "&gt;"; continue; }
    if (c === "\"") { n += "&quot;"; continue; }
    if (c === "'") { n += "&#039;"; continue; }
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
    if (c === "'") { n += "&#039;"; continue; }
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
function genPromise() {
    var call = Stacks.genCall.apply(this, arguments);
    return new Promise(function(resolve, reject) {
      resolve({genPromise: "true", r: call()});
    });
};
