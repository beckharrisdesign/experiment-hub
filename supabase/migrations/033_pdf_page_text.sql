-- Keep the text of each page beside its image, for AI suggestions.
-- openspec/changes/pdf-metadata-viewer-cloud — task 7h; design.md D15.
--
-- The words of household documents, so the same rule as the images (032): row
-- level security with no policies, reachable by the service role alone. Keyed by
-- page set rather than document, so a commit carries it and the sync's clear-out
-- removes it with the images. set_id has no foreign key because two rows of
-- pdf_page_sets may share one.
--
-- text_at on a set means every page has been read. A page with nothing to read
-- still has a row, with empty text, so it isn't read again every hour.

create table if not exists pdf_page_text (
  set_id     uuid        not null,
  page       integer     not null check (page > 0),
  text       text        not null,
  -- 'file': the PDF said it. 'ocr': tesseract read it from the image.
  source     text        not null check (source in ('file', 'ocr')),
  -- Tesseract's confidence, 0 to 100; null when the PDF said it.
  confidence integer     check (confidence between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (set_id, page)
);

alter table pdf_page_text enable row level security;
revoke all on table pdf_page_text from public, anon, authenticated;

alter table pdf_page_sets add column if not exists text_at timestamptz;
