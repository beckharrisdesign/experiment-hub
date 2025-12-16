import { Client } from '@notionhq/client';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings?.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  if (!hostname) {
    throw new Error('REPLIT_CONNECTORS_HOSTNAME not configured');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=notion',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings) {
    throw new Error('Notion not connected. Please set up the Notion integration first.');
  }

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error('Notion access token not found. Please reconnect the Notion integration.');
  }
  return accessToken;
}

export async function getUncachableNotionClient() {
  const accessToken = await getAccessToken();
  return new Client({ auth: accessToken });
}

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
  submission: LandingPageSubmission
) {
  const notion = await getUncachableNotionClient();
  
  // Build properties object based on what's provided
  const properties: Record<string, any> = {
    // Source is the title field (required)
    'Source': {
      title: [
        {
          text: {
            content: submission.source || 'landing-page',
          },
        },
      ],
    },
    'Email': {
      email: submission.email,
    },
    'SignupDate': {
      date: {
        start: new Date().toISOString(),
      },
    },
    'OptOut': {
      checkbox: submission.optOut ?? false,
    },
  };
  
  // Add optional text fields
  if (submission.name) {
    properties['Name'] = {
      rich_text: [{ text: { content: submission.name } }],
    };
  }
  
  if (submission.optOutReason) {
    properties['OptOutReason'] = {
      rich_text: [{ text: { content: submission.optOutReason } }],
    };
  }
  
  // Build notes content - include challenges if column type is Select (can't hold multiple values)
  const notesContent: string[] = [];
  if (submission.notes) {
    notesContent.push(submission.notes);
  }
  if (submission.challenges) {
    const challengeValue = Array.isArray(submission.challenges) 
      ? submission.challenges.join(', ') 
      : submission.challenges;
    notesContent.push(`Challenges: ${challengeValue}`);
  }
  if (notesContent.length > 0) {
    properties['Notes'] = {
      rich_text: [{ text: { content: notesContent.join('\n') } }],
    };
  }
  
  // Add select fields for experiment-specific data
  if (submission.seedCount) {
    properties['Seed Count'] = {
      select: { name: submission.seedCount },
    };
  }
  
  // Note: Challenges stored in Notes field above since Notion Select doesn't support multiple values
  // To use the Challenges column directly, change it to "Text" or "Multi-select" type in Notion
  
  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });
  
  return response;
}
