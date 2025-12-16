import { getUncachableNotionClient } from '@/lib/notion';
import type { LandingPageSubmission } from './types';

export async function submitToNotion(
  databaseId: string,
  submission: LandingPageSubmission
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const notion = await getUncachableNotionClient();
    
    const properties: Record<string, any> = {
      'Experiment': {
        select: {
          name: submission.experimentName,
        },
      },
      'Email': {
        email: submission.email,
      },
      'Opted In': {
        checkbox: true,
      },
      'Source': {
        select: {
          name: submission.source || 'Landing Page',
        },
      },
    };

    if (submission.name) {
      properties['Notes'] = {
        rich_text: [
          {
            text: {
              content: `Name: ${submission.name}${submission.formData ? '\n' + JSON.stringify(submission.formData, null, 2) : ''}`,
            },
          },
        ],
      };
    } else if (submission.formData && Object.keys(submission.formData).length > 0) {
      properties['Notes'] = {
        rich_text: [
          {
            text: {
              content: JSON.stringify(submission.formData, null, 2),
            },
          },
        ],
      };
    }

    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    });

    return { success: true, id: response.id };
  } catch (error: any) {
    console.error('Error submitting to Notion:', error);
    return { success: false, error: error.message };
  }
}
