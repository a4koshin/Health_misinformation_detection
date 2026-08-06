/** Claim input validation: reject full-sentence invalid inputs only. */

export const CLAIM_INPUT_EMPTY_MESSAGE =
  "Enter a Somali health claim to analyze.";

export const CLAIM_INPUT_NUMBERS_MESSAGE =
  "This kind of data is not allowed. You cannot enter a full sentence of numbers.";

export const CLAIM_INPUT_SPECIAL_CHARS_MESSAGE =
  "This kind of data is not allowed. You cannot enter a full sentence of special characters.";

export const CLAIM_INPUT_ENGLISH_MESSAGE =
  "This kind of data is not allowed. You cannot enter a full sentence in English.";

export const CLAIM_INPUT_ARABIC_MESSAGE =
  "This kind of data is not allowed. You cannot enter a full sentence in Arabic.";

/** @deprecated Use the specific messages above. */
export const CLAIM_INPUT_NOT_ALLOWED_MESSAGE = CLAIM_INPUT_ENGLISH_MESSAGE;

const ARABIC_LETTER =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const LATIN_LETTER = /[A-Za-z]/;
const DIGIT = /\d|[\u0660-\u0669\u06F0-\u06F9]/;

const ENGLISH_WORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "am",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "me",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "this",
  "that",
  "these",
  "those",
  "and",
  "or",
  "but",
  "if",
  "then",
  "so",
  "because",
  "as",
  "of",
  "to",
  "for",
  "from",
  "with",
  "without",
  "in",
  "on",
  "at",
  "by",
  "about",
  "into",
  "over",
  "after",
  "before",
  "not",
  "no",
  "yes",
  "can",
  "cannot",
  "could",
  "should",
  "would",
  "will",
  "shall",
  "may",
  "might",
  "must",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "having",
  "get",
  "got",
  "make",
  "made",
  "take",
  "taken",
  "use",
  "used",
  "using",
  "help",
  "helps",
  "cure",
  "cures",
  "cured",
  "treat",
  "treats",
  "treatment",
  "medicine",
  "medical",
  "health",
  "healthy",
  "disease",
  "diseases",
  "virus",
  "viruses",
  "covid",
  "corona",
  "coronavirus",
  "water",
  "pain",
  "fever",
  "drug",
  "drugs",
  "pill",
  "pills",
  "tablet",
  "tablets",
  "vaccine",
  "vaccines",
  "doctor",
  "hospital",
  "patient",
  "people",
  "person",
  "good",
  "bad",
  "best",
  "better",
  "safe",
  "unsafe",
  "risk",
  "risky",
  "cause",
  "causes",
  "prevent",
  "prevents",
  "prevention",
  "reduce",
  "reduces",
  "increase",
  "increases",
  "every",
  "all",
  "any",
  "some",
  "many",
  "much",
  "more",
  "most",
  "very",
  "also",
  "just",
  "only",
  "than",
  "when",
  "where",
  "what",
  "which",
  "who",
  "how",
  "why",
  "please",
  "hello",
  "hi",
  "test",
  "testing",
  "example",
  "claim",
  "check",
  "there",
  "here",
  "one",
  "two",
  "three",
  "four",
  "five",
]);

const SOMALI_MARKERS = new Set([
  "waa",
  "waxaa",
  "waxa",
  "waxay",
  "waxaan",
  "iyo",
  "ama",
  "ee",
  "oo",
  "ku",
  "ka",
  "la",
  "u",
  "ay",
  "uu",
  "aan",
  "in",
  "inuu",
  "inay",
  "sida",
  "mid",
  "loo",
  "lagu",
  "ugu",
  "soo",
  "si",
  "ah",
  "ayaa",
  "ayaan",
  "maxaa",
  "ma",
  "ha",
  "leh",
  "lahayn",
  "jiray",
  "jirtaa",
  "jirto",
  "qof",
  "dadka",
  "dad",
  "caafimaad",
  "caafimaadka",
  "cudur",
  "cudurka",
  "cudurada",
  "daawo",
  "dawo",
  "dawada",
  "xanuun",
  "xanuunka",
  "biyo",
  "biyaha",
  "cunto",
  "tallaal",
  "tallaalka",
  "maskax",
  "jirrro",
  "jirrada",
  "ammaan",
  "khatar",
  "wanagsan",
  "xun",
  "yareeyaa",
  "daaweeyaan",
  "daaweysaa",
  "ahay",
  "ahaan",
  "yahay",
  "yihiin",
  "tahay",
  "weyn",
  "yar",
  "walba",
  "kasta",
  "fadlan",
  "sheegasho",
  "talada",
  "taladaan",
  "wuu",
  "way",
  "waan",
  "uma",
  "aanan",
]);

export type ClaimValidationResult = {
  ok: boolean;
  message?: string;
};

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function isFullSentenceOfNumbers(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return false;
  return /^[\d\u0660-\u0669\u06F0-\u06F9]+$/.test(compact);
}

function isFullSentenceOfSpecialChars(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return false;
  // No letters (Latin or Arabic) and no digits — only symbols/punctuation.
  if (LATIN_LETTER.test(compact) || ARABIC_LETTER.test(compact)) return false;
  if (DIGIT.test(compact)) return false;
  return compact.length > 0;
}

function isFullSentenceOfArabic(text: string): boolean {
  let arabicLetters = 0;
  let latinLetters = 0;
  for (const ch of text) {
    if (ARABIC_LETTER.test(ch)) arabicLetters += 1;
    else if (LATIN_LETTER.test(ch)) latinLetters += 1;
  }
  if (arabicLetters === 0) return false;
  // Whole sentence is Arabic when Arabic letters dominate and no Latin letters.
  return latinLetters === 0;
}

function isFullSentenceOfEnglish(text: string): boolean {
  // English check only applies to Latin-script text.
  if (isFullSentenceOfArabic(text)) return false;
  if (isFullSentenceOfNumbers(text)) return false;
  if (isFullSentenceOfSpecialChars(text)) return false;

  const words = tokenizeWords(text);
  if (words.length === 0) return false;

  let englishHits = 0;
  let somaliHits = 0;
  for (const word of words) {
    if (ENGLISH_WORDS.has(word)) englishHits += 1;
    if (SOMALI_MARKERS.has(word)) somaliHits += 1;
  }

  // Mixed Somali + occasional English loanword is allowed.
  if (somaliHits > 0) return false;

  // Entire input reads as English (no Somali markers).
  if (words.length === 1) return ENGLISH_WORDS.has(words[0]);
  if (englishHits === 0) return false;
  if (englishHits / words.length >= 0.5) return true;
  if (englishHits >= 2) return true;
  return false;
}

/** Reject only full-sentence numbers / special chars / English / Arabic. */
export function validateSomaliClaimInput(raw: string): ClaimValidationResult {
  const text = (raw || "").trim();
  if (!text) {
    return { ok: false, message: CLAIM_INPUT_EMPTY_MESSAGE };
  }

  if (isFullSentenceOfNumbers(text)) {
    return { ok: false, message: CLAIM_INPUT_NUMBERS_MESSAGE };
  }

  if (isFullSentenceOfSpecialChars(text)) {
    return { ok: false, message: CLAIM_INPUT_SPECIAL_CHARS_MESSAGE };
  }

  if (isFullSentenceOfArabic(text)) {
    return { ok: false, message: CLAIM_INPUT_ARABIC_MESSAGE };
  }

  if (isFullSentenceOfEnglish(text)) {
    return { ok: false, message: CLAIM_INPUT_ENGLISH_MESSAGE };
  }

  return { ok: true };
}
