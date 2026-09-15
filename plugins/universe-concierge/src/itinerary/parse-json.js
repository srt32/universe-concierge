function findDuplicateObjectKey(text) {
  let index = 0;

  function skipWhitespace() {
    while (/\s/.test(text[index] ?? "")) {
      index += 1;
    }
  }

  function readString() {
    const start = index;
    index += 1;
    while (index < text.length) {
      if (text[index] === "\\") {
        index += 2;
      } else if (text[index] === '"') {
        index += 1;
        return JSON.parse(text.slice(start, index));
      } else {
        index += 1;
      }
    }
    return "";
  }

  function readValue() {
    skipWhitespace();
    if (text[index] === "{") {
      return readObject();
    }
    if (text[index] === "[") {
      return readArray();
    }
    if (text[index] === '"') {
      readString();
      return null;
    }
    while (index < text.length && !",]}".includes(text[index])) {
      index += 1;
    }
    return null;
  }

  function readArray() {
    index += 1;
    skipWhitespace();
    while (text[index] !== "]") {
      const duplicate = readValue();
      if (duplicate) {
        return duplicate;
      }
      skipWhitespace();
      if (text[index] === ",") {
        index += 1;
        skipWhitespace();
      }
    }
    index += 1;
    return null;
  }

  function readObject() {
    const keys = new Set();
    index += 1;
    skipWhitespace();
    while (text[index] !== "}") {
      const key = readString();
      if (keys.has(key)) {
        return { key };
      }
      keys.add(key);
      skipWhitespace();
      index += 1;
      const duplicate = readValue();
      if (duplicate) {
        return duplicate;
      }
      skipWhitespace();
      if (text[index] === ",") {
        index += 1;
        skipWhitespace();
      }
    }
    index += 1;
    return null;
  }

  return readValue();
}

export function parseItineraryJson(text) {
  const plan = JSON.parse(text);
  const duplicate = findDuplicateObjectKey(text);
  if (duplicate) {
    throw new SyntaxError(
      `Duplicate JSON key "${duplicate.key}" is not allowed.`,
    );
  }
  return plan;
}
