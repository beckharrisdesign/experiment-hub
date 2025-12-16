const { Client } = require('@notionhq/client');

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Replit connector not configured');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=notion',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  const data = await response.json();
  const connectionSettings = data.items?.[0];

  if (!connectionSettings) {
    throw new Error('Notion not connected');
  }

  return connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;
}

async function checkDatabase() {
  const accessToken = await getAccessToken();
  const notion = new Client({ auth: accessToken });
  const databaseId = process.env.NOTION_LANDING_DATABASE_ID;
  
  if (!databaseId) {
    console.log('No database ID configured');
    return;
  }
  
  try {
    const db = await notion.databases.retrieve({ database_id: databaseId });
    console.log(JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error:', error.message || error);
  }
}

checkDatabase();
