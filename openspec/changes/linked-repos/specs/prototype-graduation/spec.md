## Outcomes

- **Who:** Solo founder whose experiments mature beyond the hub's lifecycle.
- **Job:** Signal that a prototype has "left the nest" — it has its own repo and is no longer an in-hub experiment.
- **Done when:** An experiment can be marked Graduated and linked to a `linked_repos` entry; the experiment card and detail page reflect the graduated state; the linked repo shows the source experiment.
- **Not doing:** Automated repo creation, code migration, or archiving the experiment — graduation is a signal, not a workflow.

## ADDED Requirements

### Requirement: Graduated status and linked_repo_id on experiments

Experiments gain a `Graduated` status and a nullable FK to `linked_repos`.

**Fails until:** An experiment row can be updated to `status: "Graduated"` with a `linked_repo_id` pointing to a valid linked repo, and both fields persist correctly.

The system SHALL add `"Graduated"` to the experiment status enum and a nullable `linked_repo_id` FK on the `experiments` table (or `data/experiments.json` model), and SHALL expose an API or mutation to set both in one operation.

#### Scenario: Graduate an experiment

- **WHEN** a user marks an experiment as graduated and selects a linked repo
- **THEN** the experiment row has `status: "Graduated"` and `linked_repo_id` pointing to the selected linked repo

### Requirement: Graduated state reflected on experiment card and detail page

The experiment UI communicates the graduated state clearly.

**Fails until:** A graduated experiment's card shows a "Graduated" badge and links to the associated linked repo; the detail page shows the linked repo name with a link to its detail page.

The system SHALL update the experiment card to display a "Graduated" badge and a link to the linked repo detail page when `status === "Graduated"`, and SHALL update the experiment detail page to show the associated linked repo.

#### Scenario: Browse a graduated experiment

- **WHEN** a user views the dashboard or experiment detail for a graduated experiment
- **THEN** they see a "Graduated" badge and a link to the linked repo, not the default Active/Paused/Archived styling

### Requirement: Linked repo shows originating experiment

The linked repo detail page surfaces the experiment it was graduated from.

**Fails until:** A linked repo that is associated with a graduated experiment shows that experiment's name and a link to its detail page.

The system SHALL display a "Graduated from [experiment name]" link on the linked repo detail page when a graduated experiment points to that linked repo.

#### Scenario: View a linked repo that received a graduated experiment

- **WHEN** a user opens the linked repo detail page
- **THEN** they see the name of the experiment that graduated into it, with a link back to the experiment detail
