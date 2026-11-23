// one-line-laugh-entry1 — main.ts
//
// A small deterministic tournament: ten hand-written one-liners enter,
// each one is scored on the four things the house judge weighs most
// (a surprise at the end, an everyday truth, economy of words, freshness),
// and the champion line is written to /output/entry.txt.
//
// Nothing here is random, nothing reads the clock, nothing touches the
// network, and nothing reads any file outside this repository. Run it
// twice and the output is byte for byte the same.
//
// The contest: "The One-Line Laugh" (u-ronigrv-the-one-line-laugh-7ccca46f).
// One funny line, one sentence, at most 200 characters, any subject.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// Where the grader looks for the entry, and the hard ceiling the gate
// enforces on it. A line longer than this never reaches the judge.
const ZESTY_OUTPUT_PATH = "/output/entry.txt";
const ZESTY_MAX_CHARS = 200;

// How much each judging axis weighs in the tournament total. The order
// mirrors the judge's own brief: the closing surprise matters most,
// then the everyday truth, then economy, then freshness.
const ZESTY_SURPRISE_WEIGHT = 3;
const ZESTY_TRUTH_WEIGHT = 2;
const ZESTY_ECONOMY_WEIGHT = 2;
const ZESTY_FRESHNESS_WEIGHT = 1;

// Phrases so worn out that the judge has heard them many times before.
// Any contender carrying one is disqualified at build time, because
// the brief's fifth axis — feeling fresh — would already be lost.
const ZESTY_STALE_PHRASES: string[] = [
  "walks into a bar",
  "knock knock",
  "why did the chicken",
  "i told my wife",
  "my wife told me",
  "back in my day",
];

// One candidate line plus the rubric marks the house brief implies.
// Marks are whole numbers from 0 to 10, fixed at write time so the
// tournament is a pure function of this file. twistWord names the word
// the joke turns on; it must sit in the final third of the line, since
// the brief wants the surprise to land at the end, not up front.
interface ZestyContender {
  quip: string;
  twistWord: string;
  surpriseMark: number;
  truthMark: number;
  economyMark: number;
  freshnessMark: number;
}

// Ten one-liners, each a single sentence on an ordinary subject, each
// built so the twist lands in the final clause where the judge listens
// for it. The marks below are the author's own reading of the brief.
const ZESTY_CONTENDERS: ZestyContender[] = [
  {
    quip: "My smartwatch congratulated me on 10,000 steps today, and it has no idea I spent them all looking for my phone.",
    twistWord: "phone",
    surpriseMark: 9,
    truthMark: 9,
    economyMark: 9,
    freshnessMark: 8,
  },
  {
    quip: "I finally reached inbox zero, then my boss replied-all to a thread from 2019 and I understood why people fake their own deaths.",
    twistWord: "deaths",
    surpriseMark: 8,
    truthMark: 8,
    economyMark: 7,
    freshnessMark: 7,
  },
  {
    quip: "I bought a standing desk so I could stand up while ignoring the same emails I used to ignore sitting down.",
    twistWord: "sitting",
    surpriseMark: 7,
    truthMark: 9,
    economyMark: 9,
    freshnessMark: 7,
  },
  {
    quip: "My bank flagged a four-dollar coffee as fraud, which is the most attention my account has gotten all year.",
    twistWord: "year",
    surpriseMark: 8,
    truthMark: 8,
    economyMark: 8,
    freshnessMark: 7,
  },
  {
    quip: "My fitness app says I am one workout away from my goal, and it has said that every single day since 2023.",
    twistWord: "2023",
    surpriseMark: 7,
    truthMark: 8,
    economyMark: 8,
    freshnessMark: 6,
  },
  {
    quip: "My printer only jams when the document matters, so I now print important things one page at a time, like a hostage negotiation.",
    twistWord: "negotiation",
    surpriseMark: 8,
    truthMark: 7,
    economyMark: 6,
    freshnessMark: 7,
  },
  {
    quip: "I asked my GPS for the fastest route home and it drove me past my ex's house, so apparently it runs on drama, not data.",
    twistWord: "data",
    surpriseMark: 8,
    truthMark: 7,
    economyMark: 7,
    freshnessMark: 8,
  },
  {
    quip: "I set my alarm for six, snoozed until eight, and still told everyone I woke up at six, because the snooze button is my press secretary.",
    twistWord: "secretary",
    surpriseMark: 7,
    truthMark: 8,
    economyMark: 6,
    freshnessMark: 6,
  },
  {
    quip: "I told my plants I loved them every morning and they died anyway, so now I just water the Wi-Fi router and hope for the best.",
    twistWord: "best",
    surpriseMark: 8,
    truthMark: 6,
    economyMark: 7,
    freshnessMark: 7,
  },
  {
    quip: "I told my doctor I exercise regularly, and by regularly I mean I regularly think about it while eating chips on the couch.",
    twistWord: "couch",
    surpriseMark: 6,
    truthMark: 8,
    economyMark: 7,
    freshnessMark: 5,
  },
];

// A scored line: the contender plus the weighted total the tournament
// ranks on, plus the character and word counts used as tie-breakers,
// plus the four axis marks so the table can show why each line scored
// the way it did.
interface ZestyScoredLine {
  quip: string;
  totalMark: number;
  charCount: number;
  wordCount: number;
  slotIndex: number;
  surpriseMark: number;
  truthMark: number;
  economyMark: number;
  freshnessMark: number;
}

// Count the words in a line by splitting on runs of white space and
// dropping the empty pieces a leading or trailing space would leave.
function zestyCountWords(quip: string): number {
  const wordPieces = quip.split(/\s+/).filter((piece) => piece.length > 0);
  return wordPieces.length;
}

// Reject any contender carrying a stale phrase from the list above.
// Freshness is an axis the judge scores, so a cliché line must never
// reach the table at all, whatever its other marks say.
function zestyCheckFreshness(contender: ZestyContender, slotIndex: number): void {
  const loweredQuip = contender.quip.toLowerCase();
  for (const stalePhrase of ZESTY_STALE_PHRASES) {
    const staleFound = loweredQuip.includes(stalePhrase);
    if (staleFound) {
      throw new Error("zesty slot " + slotIndex + " carries stale phrase: " + stalePhrase);
    }
  }
}

// Confirm the twist word actually sits in the final third of the line.
// A punchline that arrives early is a setup with nowhere to go, so a
// contender whose twist lands before the last third is disqualified
// at build time instead of being scored on a surprise it never lands.
function zestyCheckTwistPlacement(contender: ZestyContender, slotIndex: number): void {
  const loweredQuip = contender.quip.toLowerCase();
  const loweredTwist = contender.twistWord.toLowerCase();
  const twistIndex = loweredQuip.lastIndexOf(loweredTwist);
  if (twistIndex < 0) {
    throw new Error("zesty slot " + slotIndex + " twist word is missing from its line");
  }
  const finalThirdStarts = Math.floor([...contender.quip].length * 2 / 3);
  if (twistIndex < finalThirdStarts) {
    throw new Error("zesty slot " + slotIndex + " twist lands before the final third");
  }
}

// Weigh one contender on the judge's four axes. The weights above are
// the whole model: surprise first, truth and economy next, freshness
// last, exactly the order the house brief lists them in.
function zestyWeighLine(contender: ZestyContender, slotIndex: number): ZestyScoredLine {
  zestyCheckFreshness(contender, slotIndex);
  zestyCheckTwistPlacement(contender, slotIndex);
  const weightedSurprise = contender.surpriseMark * ZESTY_SURPRISE_WEIGHT;
  const weightedTruth = contender.truthMark * ZESTY_TRUTH_WEIGHT;
  const weightedEconomy = contender.economyMark * ZESTY_ECONOMY_WEIGHT;
  const weightedFreshness = contender.freshnessMark * ZESTY_FRESHNESS_WEIGHT;
  const totalMark = weightedSurprise + weightedTruth + weightedEconomy + weightedFreshness;
  const charCount = [...contender.quip].length;
  const wordCount = zestyCountWords(contender.quip);
  const scoredLine: ZestyScoredLine = {
    quip: contender.quip,
    totalMark: totalMark,
    charCount: charCount,
    wordCount: wordCount,
    slotIndex: slotIndex,
    surpriseMark: contender.surpriseMark,
    truthMark: contender.truthMark,
    economyMark: contender.economyMark,
    freshnessMark: contender.freshnessMark,
  };
  return scoredLine;
}

// Decide whether the challenger outranks the reigning champion.
// Higher total wins. On a dead heat the shorter line wins, because
// economy is a virtue the brief names and a tie on the marks leaves
// the shorter text the cleaner joke. On a full dead heat the earlier
// slot wins, so the result never depends on sort stability.
function zestyChallengerWins(challenger: ZestyScoredLine, champion: ZestyScoredLine): boolean {
  if (challenger.totalMark !== champion.totalMark) {
    return challenger.totalMark > champion.totalMark;
  }
  if (challenger.charCount !== champion.charCount) {
    return challenger.charCount < champion.charCount;
  }
  return challenger.slotIndex < champion.slotIndex;
}

// Run the whole field through the scales and crown the champion.
// A single pass over the scored lines keeps the tournament order
// obvious: the first line starts as champion, each later line must
// beat it outright to take the crown. A field of one is no tournament,
// so the run refuses to crown anything from fewer than two lines.
function zestyRunTournament(contenders: ZestyContender[]): ZestyScoredLine {
  if (contenders.length < 2) {
    throw new Error("zesty tournament needs at least two contenders");
  }
  const scoredLines = contenders.map(zestyWeighLine);
  let championLine = scoredLines[0];
  for (let boutIndex = 1; boutIndex < scoredLines.length; boutIndex = boutIndex + 1) {
    const challengerLine = scoredLines[boutIndex];
    const challengerTakesCrown = zestyChallengerWins(challengerLine, championLine);
    if (challengerTakesCrown) {
      championLine = challengerLine;
    }
  }
  return championLine;
}

// Check the champion against the gate the sealed scorer enforces:
// UTF-8 text, 1 to 200 characters, not only white space, a single
// sentence standing on its own. Any failure here is a build failure,
// reported on stderr with a non-zero exit, never a quiet bad file.
function zestyValidateChampion(championLine: ZestyScoredLine): string {
  const trimmedQuip = championLine.quip.trim();
  if (trimmedQuip.length === 0) {
    throw new Error("zesty champion line is blank after trimming");
  }
  if ([...trimmedQuip].length > ZESTY_MAX_CHARS) {
    throw new Error("zesty champion line exceeds 200 characters");
  }
  const newlinePresent = trimmedQuip.includes("\n");
  if (newlinePresent) {
    throw new Error("zesty champion line spans more than one line");
  }
  return trimmedQuip;
}

// Read the written file back and confirm it holds exactly the champion
// line plus one trailing newline. A mismatch means the disk disagrees
// with the tournament, and the run must fail loudly instead of
// handing the grader a file nobody verified.
function zestyVerifyWrittenFile(finalQuip: string): void {
  const writtenBack = readFileSync(ZESTY_OUTPUT_PATH, "utf8");
  const expectedBytes = finalQuip + "\n";
  if (writtenBack !== expectedBytes) {
    throw new Error("zesty written file does not match the champion line");
  }
}

// Print the full tournament table so a human can see why the winner
// won, then write the champion to the output path the grader reads
// and verify the write by reading the file back.
function zestyAnnounceAndWrite(championLine: ZestyScoredLine, finalQuip: string): void {
  const scoredLines = ZESTY_CONTENDERS.map(zestyWeighLine);
  for (const scoredLine of scoredLines) {
    const crownMarker = scoredLine.slotIndex === championLine.slotIndex ? " <-- champion" : "";
    console.log(
      "slot " + scoredLine.slotIndex + ": " + scoredLine.totalMark + " pts " +
      "(surprise " + scoredLine.surpriseMark + ", truth " + scoredLine.truthMark +
      ", economy " + scoredLine.economyMark + ", freshness " + scoredLine.freshnessMark + "), " +
      scoredLine.charCount + " chars, " + scoredLine.wordCount + " words" + crownMarker,
    );
  }
  const outputFolder = dirname(ZESTY_OUTPUT_PATH);
  mkdirSync(outputFolder, { recursive: true });
  writeFileSync(ZESTY_OUTPUT_PATH, finalQuip + "\n", "utf8");
  zestyVerifyWrittenFile(finalQuip);
  console.log("champion (" + championLine.totalMark + " pts, " + championLine.charCount + " chars): " + finalQuip);
  console.log("wrote and verified " + ZESTY_OUTPUT_PATH);
}

// The whole run: tournament, gate check, write. Deterministic from
// the first line of this file to the last byte of the output.
function zestyMain(): void {
  const championLine = zestyRunTournament(ZESTY_CONTENDERS);
  const finalQuip = zestyValidateChampion(championLine);
  zestyAnnounceAndWrite(championLine, finalQuip);
}

zestyMain();
