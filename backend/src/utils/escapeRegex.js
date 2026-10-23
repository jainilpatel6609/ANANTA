// Escapes regex metacharacters in a string so it can be safely interpolated into a MongoDB
// $regex filter as a LITERAL match (e.g. a case-insensitive exact-name lookup). Without this,
// a name containing characters like "(10 + 20 ) mm Mix" silently fails to match itself, because
// '(', ')' and '+' are regex metacharacters, not literal text, once interpolated unescaped.
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { escapeRegex };
