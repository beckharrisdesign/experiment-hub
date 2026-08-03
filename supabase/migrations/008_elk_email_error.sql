-- Etsy Listing Kit: make failed confirmation emails visible.
--
-- A buyer paid, fulfillment succeeded, and the email silently failed with the
-- reason discarded (orders 0484a635 and 8062b1c9, both live). Record the
-- attempt and the provider's rejection so a missing email is diagnosable
-- instead of invisible.

alter table elk_orders add column if not exists email_error text;
alter table elk_orders add column if not exists email_attempted_at timestamptz;

comment on column elk_orders.email_error is
  'Provider rejection reason from the last send attempt; null once a send succeeds.';
comment on column elk_orders.email_attempted_at is
  'When the last confirmation-email send was attempted (success or failure).';
