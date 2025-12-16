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

// Valid options for multi-select fields (must match Notion database options)
const VALID_SEED_COUNTS = ['less-than-20', '20-50', '50-plus'];
const VALID_CHALLENGES = ['Buying duplicates', 'Lost the packet', 'Are these still good?'];

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
  
  if (submission.notes) {
    properties['Notes'] = {
      rich_text: [{ text: { content: submission.notes } }],
    };
  }
  
  // Add multi-select field for Seed Count (validate against allowed options)
  if (submission.seedCount && VALID_SEED_COUNTS.includes(submission.seedCount)) {
    properties['Seed Count'] = {
      multi_select: [{ name: submission.seedCount }],
    };
  }
  
  // Add multi-select field for Challenges (validate against allowed options)
  if (submission.challenges) {
    const challengesArray = Array.isArray(submission.challenges) 
      ? submission.challenges 
      : [submission.challenges];
    
    // Filter to only valid options
    const validChallenges = challengesArray.filter(c => VALID_CHALLENGES.includes(c));
    
    if (validChallenges.length > 0) {
      properties['Challenges'] = {
        multi_select: validChallenges.map(c => ({ name: c })),
      };
    }
  }
  
  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });
  
  return response;
}
