"""Minimal Notion API client — just what the sync step needs."""
import requests

API_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


class NotionApiError(RuntimeError):
    pass


class NotionClient:
    def __init__(self, token, session=None):
        self.token = token
        self.session = session or requests.Session()

    def _headers(self):
        return {
            "Authorization": "Bearer {}".format(self.token),
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        }

    def _check(self, response, context):
        if response.status_code >= 400:
            raise NotionApiError(
                "{} failed with {}: {}".format(context, response.status_code, response.text[:500])
            )
        return response.json()

    def get_database(self, database_id):
        response = self.session.get(
            "{}/databases/{}".format(API_BASE, database_id), headers=self._headers(), timeout=30
        )
        return self._check(response, "GET database {}".format(database_id))

    def update_database(self, database_id, properties):
        """Add or update database properties, e.g. {"Description": {"rich_text": {}}}."""
        response = self.session.patch(
            "{}/databases/{}".format(API_BASE, database_id),
            headers=self._headers(),
            json={"properties": properties},
            timeout=30,
        )
        return self._check(response, "Update database {}".format(database_id))

    def query_database_all(self, database_id):
        """Yield every page in the database, following pagination."""
        cursor = None
        while True:
            body = {"start_cursor": cursor} if cursor else {}
            response = self.session.post(
                "{}/databases/{}/query".format(API_BASE, database_id),
                headers=self._headers(),
                json=body,
                timeout=30,
            )
            payload = self._check(response, "Query database {}".format(database_id))
            for page in payload.get("results") or []:
                yield page
            if not payload.get("has_more"):
                break
            cursor = payload.get("next_cursor")

    def create_page(self, database_id, properties):
        response = self.session.post(
            "{}/pages".format(API_BASE),
            headers=self._headers(),
            json={"parent": {"database_id": database_id}, "properties": properties},
            timeout=30,
        )
        return self._check(response, "Create page in {}".format(database_id))

    def update_page(self, page_id, properties):
        response = self.session.patch(
            "{}/pages/{}".format(API_BASE, page_id),
            headers=self._headers(),
            json={"properties": properties},
            timeout=30,
        )
        return self._check(response, "Update page {}".format(page_id))

    def create_comment(self, page_id, text):
        """Post a plain-text comment on a page.

        Requires the integration to have the "insert comments" capability
        enabled in Notion; without it the API returns 403.
        """
        response = self.session.post(
            "{}/comments".format(API_BASE),
            headers=self._headers(),
            json={
                "parent": {"page_id": page_id},
                "rich_text": [{"text": {"content": text}}],
            },
            timeout=30,
        )
        return self._check(response, "Create comment on {}".format(page_id))
