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
  experimentId: string;
  experimentName: string;
  email: string;
  optedIn: boolean;
  optOutReason?: string;
  source?: string;
  notes?: string;
}

export async function submitLandingPageResponse(
  databaseId: string,
  submission: LandingPageSubmission
) {
  const notion = await getUncachableNotionClient();
  
  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      'Experiment': {
        select: {
          name: submission.experimentName,
        },
      },
      'Email': {
        email: submission.email,
      },
      'Opted In': {
        checkbox: submission.optedIn,
      },
      'Opt-Out Reason': {
        rich_text: [
          {
            text: {
              content: submission.optOutReason || '',
            },
          },
        ],
      },
      'Source': {
        select: {
          name: submission.source || 'Direct',
        },
      },
      'Notes': {
        rich_text: [
          {
            text: {
              content: submission.notes || '',
            },
          },
        ],
      },
    },
  });
  
  return response;
}
