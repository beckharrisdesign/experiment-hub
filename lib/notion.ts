import { Client } from "@notionhq/client";
import { resolveNotionToken } from "@experiment-hub/notion-auth";

/**
 * Notion client for the hub.
 *
 * Auth resolution lives in `@experiment-hub/notion-auth` so experiment
 * prototypes — which are plain Node with no build step — share exactly this
 * logic instead of reimplementing it. Configure NOTION_TOKEN once and both
 * this app and the prototypes pick it up; inside Replit the connector is used
 * automatically.
 */
export async function getUncachableNotionClient() {
  return new Client({ auth: await resolveNotionToken() });
}

// Valid options for multi-select fields (must match Notion database options)
const VALID_SEED_COUNTS = ["less-than-20", "20-50", "50-plus"];
const VALID_CHALLENGES = [
  "Buying duplicates",
  "Lost the packet",
  "Are these still good?",
];

export interface LandingPageSubmission {
  experiment: string;
  email: string;
  name?: string;
  seedCount?: string;
  challenges?: string | string[];
  optOut?: boolean;
  optOutReason?: string;
  source?: string;
  notes?: string;
}

export async function submitLandingPageResponse(
  databaseId: string,
  submission: LandingPageSubmission,
) {
  const notion = await getUncachableNotionClient();

  // Build properties object based on what's provided
  const properties: Record<string, any> = {
    // Source is the title field (required)
    Source: {
      title: [
        {
          text: {
            content: submission.source || "landing-page",
          },
        },
      ],
    },
    Email: {
      email: submission.email,
    },
    SignupDate: {
      date: {
        start: new Date().toISOString(),
      },
    },
    OptOut: {
      checkbox: submission.optOut ?? false,
    },
  };

  // Add optional text fields
  if (submission.name) {
    properties["Name"] = {
      rich_text: [{ text: { content: submission.name } }],
    };
  }

  if (submission.optOutReason) {
    properties["OptOutReason"] = {
      rich_text: [{ text: { content: submission.optOutReason } }],
    };
  }

  if (submission.notes) {
    properties["Notes"] = {
      rich_text: [{ text: { content: submission.notes } }],
    };
  }

  // Add multi-select field for Seed Count (validate against allowed options)
  if (
    submission.seedCount &&
    VALID_SEED_COUNTS.includes(submission.seedCount)
  ) {
    properties["Seed Count"] = {
      multi_select: [{ name: submission.seedCount }],
    };
  }

  // Add multi-select field for Challenges (validate against allowed options)
  if (submission.challenges) {
    const challengesArray = Array.isArray(submission.challenges)
      ? submission.challenges
      : [submission.challenges];

    // Filter to only valid options
    const validChallenges = challengesArray.filter((c) =>
      VALID_CHALLENGES.includes(c),
    );

    if (validChallenges.length > 0) {
      properties["Challenges"] = {
        multi_select: validChallenges.map((c) => ({ name: c })),
      };
    }
  }

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });

  return response;
}
