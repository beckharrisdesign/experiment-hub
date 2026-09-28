/**
 * Turn a short prompt into a face recipe. Matching is a word list on purpose:
 * the same words always carve the same joke, and nothing leaves the browser.
 */

const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "with", "who", "in", "on", "at", "to",
  "for", "my", "me", "please", "very", "really", "super", "little", "big",
  "just", "like", "face", "faces", "pumpkin", "pumpkins", "jack", "lantern",
  "lanterns", "o", "ol", "funny", "cute", "halloween", "carve", "carved",
]);

const MOODS = {
  happy: { eyes: "triangle", brows: "none", nose: "triangle", mouth: "smile" },
  grumpy: { eyes: "triangle", brows: "angry", nose: "triangle", mouth: "frown" },
  surprised: { eyes: "circle", brows: "raised", nose: "triangle", mouth: "o" },
  sleepy: { eyes: "sleepy", brows: "none", nose: "none", mouth: "line" },
  smug: { eyes: "wink", brows: "arched", nose: "triangle", mouth: "smirk" },
  scared: { eyes: "circle", brows: "worried", nose: "triangle", mouth: "wavy" },
  lovestruck: { eyes: "heart", brows: "none", nose: "heart", mouth: "smile" },
  deadpan: { eyes: "dot", brows: "none", nose: "none", mouth: "line" },
  unhinged: { eyes: "spiral", brows: "uneven", nose: "triangle", mouth: "zigzag" },
  sad: { eyes: "oval", brows: "worried", nose: "none", mouth: "frown" },
  silly: { eyes: "uneven", brows: "raised", nose: "circle", mouth: "tongue" },
  vampire: { eyes: "oval", brows: "arched", nose: "triangle", mouth: "fangs" },
};

const MOOD_LIST = [
  "happy", "grumpy", "surprised", "sleepy", "smug", "scared", "lovestruck",
  "deadpan", "unhinged", "sad", "silly",
];

const MOOD_ADJ = {
  happy: "happy",
  grumpy: "grumpy",
  surprised: "surprised",
  sleepy: "sleepy",
  smug: "smug",
  scared: "scared",
  lovestruck: "lovestruck",
  deadpan: "deadpan",
  unhinged: "unhinged",
  sad: "sad",
  silly: "silly",
  vampire: "vampiric",
};

/** @type {Array<Record<string, unknown>>} */
const ENTRIES = [
  { words: ["grumpy", "cranky", "grouchy", "annoyed"], mood: "grumpy" },
  { words: ["angry", "mad", "furious", "scowling"], mood: "grumpy" },
  { words: ["happy", "cheerful", "joyful", "glad", "grinning"], mood: "happy" },
  { words: ["surprised", "shocked", "startled", "gasping"], mood: "surprised" },
  { words: ["sleepy", "tired", "bored", "drowsy", "yawning"], mood: "sleepy" },
  { words: ["smug", "mischievous", "sly", "cheeky", "winking"], mood: "smug" },
  { words: ["scared", "frightened", "nervous", "afraid"], mood: "scared" },
  { words: ["lovestruck", "romantic", "smitten"], mood: "lovestruck" },
  { words: ["sad", "crying", "gloomy", "melancholy"], mood: "sad" },
  { words: ["deadpan", "blank", "expressionless"], mood: "deadpan" },
  { words: ["unhinged", "chaotic", "feral", "deranged"], mood: "unhinged" },
  { words: ["silly", "goofy", "derpy"], mood: "silly" },
  { words: ["cool", "chill"], mood: "smug" },

  { words: ["wink", "winking"], eyes: "wink" },
  { words: ["heart", "hearts"], eyes: "heart", mood: "lovestruck" },
  { words: ["star", "stars"], eyes: "star" },
  { words: ["spiral", "dizzy"], eyes: "spiral" },
  { words: ["unibrow"], brows: "unibrow" },

  { words: ["cat", "kitten", "kitty"], extra: "cat-ears", noun: "cat" },
  { words: ["dog", "puppy", "pup"], extra: "dog-ears", noun: "dog", twist: "who heard both walk and bath" },
  { words: ["bat"], extra: "bat-ears", noun: "bat", twist: "who is here for the night shift" },
  { words: ["devil", "demon"], extra: "horns", noun: "devil" },
  { words: ["monster"], extra: "horns", mouth: "zigzag", noun: "monster", twist: "who did not read the brief" },
  {
    words: ["alien"],
    eyes: "oval",
    mouth: "o",
    nose: "none",
    eyeScale: 1.55,
    mouthScale: 0.55,
    noun: "alien",
    twist: "who thinks this is what humans look like",
  },
  {
    words: ["robot", "bot"],
    eyes: "square",
    mouth: "line",
    nose: "none",
    noun: "robot",
    twist: "attempting a feeling. The feeling is beep",
  },
  {
    words: ["vampire", "dracula"],
    mood: "vampire",
    noun: "vampire",
    twist: "who will not show up in a photo",
  },
  {
    words: ["pirate"],
    extra: "eyepatch",
    extra2: "scar",
    noun: "pirate",
    twist: "The eyepatch is not a carving mistake.",
  },
  { words: ["cowboy"], extra: "hat-cowboy", noun: "cowboy", twist: "The hat is structural." },
  { words: ["witch"], extra: "hat-witch", noun: "witch", twist: "The hat is doing the job of a stem." },
  {
    words: ["wizard"],
    extra: "hat-witch",
    extra2: "beard",
    noun: "wizard",
    twist: "The hat is doing the job of a stem.",
  },
  {
    words: ["clown"],
    nose: "circle",
    mouth: "smile",
    noun: "clown",
    twist: "The nose is a circle on purpose.",
  },
  {
    words: ["chef", "cook"],
    extra: "hat-chef",
    extra2: "mustache",
    noun: "chef",
    twist: "who has opinions about pie",
  },
  {
    words: ["librarian", "nerd"],
    extra: "glasses",
    noun: "librarian",
    twist: "who just found the overdue list",
  },
  { words: ["professor"], extra: "glasses", noun: "professor", twist: "who assigned extra reading" },
  {
    words: ["grandpa", "grandfather"],
    extra: "glasses",
    extra2: "mustache",
    noun: "grandpa",
    twist: "who brought the candy and the stare",
  },
  {
    words: ["grandma", "grandmother", "granny"],
    extra: "glasses",
    noun: "grandma",
    twist: "who brought the candy and the stare",
  },
  { words: ["baby"], eyes: "circle", mouth: "smile", eyeScale: 1.45, noun: "baby", twist: "who is mostly cheeks" },
  { words: ["owl"], eyes: "circle", nose: "none", eyeScale: 1.6, noun: "owl", twist: "who is mostly eyes" },
  { words: ["ghost"], eyes: "oval", mouth: "o", nose: "none", noun: "ghost", twist: "who is practicing the vowels" },
  { words: ["skeleton", "skull"], eyes: "x", mouth: "teeth", nose: "triangle", noun: "skeleton", twist: "who skipped straight to the teeth" },
  { words: ["frankenstein"], extra: "scar", eyes: "uneven", noun: "frankenstein" },
  { words: ["princess", "queen", "king"], extra: "crown", noun: "royal", twist: "The crown is not a stem." },
  {
    words: ["hipster"],
    extra: "glasses",
    extra2: "mustache",
    extra3: "hat-beanie",
    noun: "hipster",
    twist: "who carved this before it was cool",
  },
  { words: ["mustache", "moustache"], extra: "mustache" },
  { words: ["beard"], extra: "beard" },
  { words: ["monocle"], extra: "monocle" },
  { words: ["glasses", "spectacles"], extra: "glasses" },
  { words: ["freckles"], extra: "freckles" },
  { words: ["scar"], extra: "scar" },
  { words: ["eyepatch", "patch"], extra: "eyepatch" },
  { words: ["fangs"], mouth: "fangs" },
  { words: ["tongue"], mouth: "tongue" },
  { words: ["bowtie", "fancy", "formal"], extra: "bowtie" },
  { words: ["blush"], extra: "blush" },
  { words: ["crown"], extra: "crown" },
  { words: ["horns"], extra: "horns" },
];

const PHRASES = [
  { phrase: "heart eyes", eyes: "heart", mood: "lovestruck" },
  { phrase: "star eyes", eyes: "star" },
  { phrase: "tongue out", mouth: "tongue" },
  { phrase: "jack o lantern", ignore: true },
];

const WORD_INDEX = new Map();
for (const entry of ENTRIES) {
  for (const word of entry.words) WORD_INDEX.set(word, entry);
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function unique(list) {
  return [...new Set(list)];
}

function indef(phrase) {
  const word = phrase.trim().split(/\s+/)[0] ?? "";
  return /^[aeiou]/i.test(word) ? "An" : "A";
}

function applyEntry(bag, entry) {
  if (!entry || entry.ignore) return;
  bag.hit = true;
  if (entry.mood) {
    bag.mood = entry.mood;
    bag.moodExplicit = true;
  }
  if (entry.eyes) bag.eyes = entry.eyes;
  if (entry.brows) bag.brows = entry.brows;
  if (entry.mouth) bag.mouth = entry.mouth;
  if (entry.nose !== undefined) bag.nose = entry.nose;
  if (entry.eyeScale) bag.eyeScale = entry.eyeScale;
  if (entry.mouthScale) bag.mouthScale = entry.mouthScale;
  for (const key of ["extra", "extra2", "extra3"]) {
    if (entry[key]) bag.extras.push(entry[key]);
  }
  if (entry.noun) bag.nouns.push(entry.noun);
  if (entry.twist) bag.twists.push(entry.twist);
}

function composeReading(raw, tokens, bag, mood) {
  if (!raw) {
    return "This pumpkin showed up with no prompt, so it invented a personality.";
  }
  if (!bag.hit) {
    if (tokens.length === 0 || tokens.every((token) => STOP.has(token))) {
      return "Just a pumpkin. It brought its own face.";
    }
    const clip = raw.length > 80 ? `${raw.slice(0, 77)}…` : raw;
    return `“${clip}” didn't match a face I know, so this pumpkin improvised.`;
  }

  const nouns = unique(bag.nouns);
  const subject = nouns.length ? nouns.join(" ") : "pumpkin";
  const repeatsNoun = nouns.some((noun) => noun.startsWith(mood));
  const adj = bag.moodExplicit && !repeatsNoun && MOOD_ADJ[mood] ? `${MOOD_ADJ[mood]} ` : "";
  const core = `${adj}${subject}`.trim();
  let sentence = `${indef(core)} ${core}`;
  const twist = bag.twists[0];
  if (twist) {
    if (/^[A-Z]/.test(twist)) {
      if (!sentence.endsWith(".")) sentence += ".";
      sentence += ` ${twist}`;
    } else {
      sentence += ` ${twist}`;
    }
  }
  sentence = sentence.replace(/\s+/g, " ").trim();
  if (!/[.!?]$/.test(sentence)) sentence += ".";
  return sentence;
}

export function interpretPrompt(prompt) {
  const raw = String(prompt ?? "").trim().replace(/\s+/g, " ");
  const key = raw.toLowerCase();
  const tokens = tokenize(key);
  const consumed = new Set();
  const bag = {
    hit: false,
    mood: undefined,
    moodExplicit: false,
    eyes: undefined,
    brows: undefined,
    nose: undefined,
    mouth: undefined,
    eyeScale: undefined,
    mouthScale: undefined,
    extras: [],
    nouns: [],
    twists: [],
  };

  for (const entry of PHRASES) {
    const parts = entry.phrase.split(" ");
    for (let i = 0; i <= tokens.length - parts.length; i++) {
      const matches = parts.every((part, offset) => tokens[i + offset] === part && !consumed.has(i + offset));
      if (!matches) continue;
      parts.forEach((_, offset) => consumed.add(i + offset));
      applyEntry(bag, entry);
    }
  }

  const unmatched = [];
  for (let i = 0; i < tokens.length; i++) {
    if (consumed.has(i)) continue;
    const entry = WORD_INDEX.get(tokens[i]);
    if (entry) applyEntry(bag, entry);
    else if (!STOP.has(tokens[i])) unmatched.push(tokens[i]);
  }

  const seed = hashString(key);
  const improvised = !bag.hit && unmatched.length > 0;
  if (!bag.mood) {
    bag.mood = improvised ? MOOD_LIST[seed % MOOD_LIST.length] : "happy";
  }

  const mood = bag.mood;
  const base = MOODS[mood] ?? MOODS.happy;
  const rng = mulberry32(seed);
  const extras = unique(bag.extras);
  if (mood === "lovestruck" && !extras.includes("blush")) extras.push("blush");

  const face = {
    prompt: raw,
    seed,
    mood,
    eyes: bag.eyes ?? base.eyes,
    brows: bag.brows ?? base.brows,
    nose: bag.nose !== undefined ? bag.nose : base.nose,
    mouth: bag.mouth ?? base.mouth,
    extras,
    improvised,
    unmatched,
    layout: {
      eyeScale: (bag.eyeScale ?? 1) * (0.88 + rng() * 0.24),
      gap: 0.94 + rng() * 0.12,
      mouthScale: (bag.mouthScale ?? 1) * (0.88 + rng() * 0.24),
      browTilt: rng() * 2 - 1,
      wink: rng() < 0.5 ? "left" : "right",
    },
  };
  face.reading = composeReading(raw, tokens, bag, mood);
  return face;
}
