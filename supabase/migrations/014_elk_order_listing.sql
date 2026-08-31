-- elk-listing-evaluation 3.4b/3.5e: orders bought for, and built from, the
-- evaluated listing (no upload). listing_id is the fulfillment input;
-- listing_title is stored at checkout for display/email without a refetch.
-- Upload-era orders keep input_ref and leave these null.

alter table elk_orders add column if not exists listing_id bigint;
alter table elk_orders add column if not exists listing_title text;

comment on column elk_orders.listing_id is
  'Etsy listing the kit is built from (evaluation-seeded checkout). Null for upload-era orders.';
comment on column elk_orders.listing_title is
  'Listing title captured at checkout, for display and email without a refetch.';
