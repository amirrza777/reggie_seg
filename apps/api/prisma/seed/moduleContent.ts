import { randParagraph, randSentence } from "@ngneat/falso";

type SeedModuleContent = {
  briefText: string;
  expectationsText: string;
  readinessNotesText: string;
};

const expectationRows = [
  {
    expectation: "Attendance and preparation",
    owner: "Students",
    target: "Arrive prepared for taught sessions, team checkpoints, and weekly planning activities.",
  },
  {
    expectation: "Delivery and review cadence",
    owner: "Teams",
    target: "Maintain visible weekly progress, review work regularly, and surface blockers early.",
  },
  {
    expectation: "Communication and documentation",
    owner: "All contributors",
    target: "Keep decisions, repository changes, and handover notes clear enough for staff review.",
  },
];

export function buildSeedModuleContent(moduleName: string, _index: number): SeedModuleContent {
  return {
    briefText: buildBriefText(moduleName),
    expectationsText: buildExpectationsText(),
    readinessNotesText: buildReadinessNotesText(moduleName),
  };
}

function buildBriefText(moduleName: string) {
  const supportingParagraph = normalizeSentenceBlock(randParagraph({ length: 2 }));

  return [
    `${moduleName} is seeded as a collaborative, project-based module where students are expected to plan work clearly, share responsibility across the team, and evidence progress through regular delivery checkpoints.`,
    supportingParagraph,
  ].join("\n\n");
}

function buildExpectationsText() {
  return expectationRows
    .map((row) => {
      const targetTail = normalizeSentenceBlock(randSentence()).replace(/[.?!]+$/, "").toLowerCase();
      return `${row.expectation} | ${row.target} ${targetTail}. | ${row.owner}`;
    })
    .join("\n");
}

function buildReadinessNotesText(moduleName: string) {
  const practicalParagraph = normalizeSentenceBlock(randParagraph({ length: 2 }));
  const closingSentence = normalizeSentenceBlock(randSentence());

  return [
    `Before ${moduleName} begins, students should confirm access to core tooling, repository workflows, communication channels, and any shared documentation spaces used to coordinate project delivery and review.`,
    `${practicalParagraph} ${closingSentence}`.trim(),
  ].join("\n\n");
}

function normalizeSentenceBlock(value: string | string[]) {
  const text = Array.isArray(value) ? value.join(" ") : value;
  return text.replace(/\s+/g, " ").trim();
}
