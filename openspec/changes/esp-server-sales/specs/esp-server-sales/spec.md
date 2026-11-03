## Outcomes

See `../../proposal.md`. Done when every sale, every change to it and its photos are saved on
the server without a Save button. Opening the app on the same phone has to load them back,
even after Safari has deleted everything the site kept. Only that phone can read them, and a
dropped signal can't lose a change. Not doing: sign-in, a second device, sharing, sale and item
tables (all #50), or anything new on screen.

## ADDED Requirements

### Requirement: Every change to a sale is saved on the server

The family never saves by hand: each change to a sale reaches the server within a few seconds,
and a dropped signal only delays it.

**Fails until:** after an edit, the sale's row on the server holds the edit.

The app SHALL send the whole sale to the server within 5 seconds of a change while online, keep unsent changes on the phone while offline and send them when back online, and the server SHALL keep the newest version.

#### Scenario: An edit reaches the server

- **WHEN** the family renames an item or moves it to Sell while online
- **THEN** within 5 seconds the sale stored on the server shows the new name or destination

#### Scenario: A dropped signal delays the save and loses nothing

- **WHEN** the family makes changes with no signal, then the signal comes back
- **THEN** the changes reach the server without the family doing anything, and none is lost

#### Scenario: An older copy never overwrites a newer one

- **WHEN** a save that started earlier arrives after a later one
- **THEN** the server keeps the later version

### Requirement: Photos are saved on the server

Every kept photo (the 1600 px original) is stored privately on the server as well as on the
phone, so re-cropping works after the phone's copy is gone.

**Fails until:** after a walkthrough, each item's original exists in the private bucket.

The app SHALL upload each original to a private storage bucket after capture, retrying until it lands, and SHALL record where it lives against the sale and photo key.

#### Scenario: A walkthrough's photos reach the server

- **WHEN** the family finishes a walkthrough while online
- **THEN** each kept original is stored in the private bucket under that sale, and the server records it

#### Scenario: A failed upload is retried

- **WHEN** a photo upload fails or the signal drops
- **THEN** the app tries again later, and the photo reaches the server without the family doing anything

### Requirement: The app loads sales from the server

The phone's storage is only a cache: when it's empty or a photo is missing, the app fills it
from the server.

**Fails until:** a phone with its site data cleared opens to its sales instead of an empty
Home.

The app SHALL list and open the phone's sales from the server when the phone holds no copy, SHALL load a missing original from the server, and SHALL send sales already on the phone to the server the first time this version opens.

#### Scenario: Sales come back after Safari clears the site

- **WHEN** Safari has deleted the site's saved data and the family opens the app on the same phone
- **THEN** Home lists their sales, and each opens with its items, prices, destinations, corrections and photos

#### Scenario: A photo the phone dropped loads from the server

- **WHEN** an original has been evicted from the phone's photo store and the family opens the photo or adjusts the box
- **THEN** the photo loads from the server and the correction works

#### Scenario: Sales already on the phone go up once

- **WHEN** the family first opens this version with sales saved on the phone
- **THEN** those sales and their photos are sent to the server, and opening the app again doesn't send them twice

### Requirement: Only the phone that made a sale can read it

Until sign-in, a phone's sales belong to a private id the server keeps in a cookie on that
phone, and nothing else opens them.

**Fails until:** a request without that phone's cookie gets nothing back for its sale id.

The server SHALL set a long-lived, random, HttpOnly, Secure first-party cookie on first visit, SHALL serve and accept a sale or photo only for the device id that created it, and SHALL serve photos only through its own routes, never as a link that could be shared.

#### Scenario: A first visit gets a private id

- **WHEN** a phone opens the app for the first time
- **THEN** the server sets a private id cookie that page scripts can't read, and sales from that phone are stored under it

#### Scenario: Another device or a guessed sale id gets nothing

- **WHEN** a request for a sale or photo comes without the cookie that created it, from another browser or with a copied or guessed sale id
- **THEN** the server answers as if the sale doesn't exist, and nothing about it is returned

#### Scenario: A photo is never handed out as a link

- **WHEN** the phone loads one of its photos from the server
- **THEN** the bytes come from the hub's own route, checked against the phone's cookie, and no storage link leaves the server

> *2026-11-03, live run:* this was "a photo link stops working after an hour". The hub's Content
> Security Policy blocks the page from fetching Supabase directly, so the route now serves the
> bytes itself. That's stricter: there is no link to expire.

### Requirement: Saving never gets in the way of the walkthrough

Server saves happen in the background: the walkthrough, corrections and lookups work the same
whether a save succeeds, fails or is still waiting.

**Fails until:** with the save routes failing, a walkthrough still completes and its items can
be corrected.

The app SHALL keep every screen working from the phone's copy while saves are pending or failing, and SHALL show the "Photo no longer on this device" state only when the photo is neither on the phone nor reachable on the server.

#### Scenario: The server is down mid-walkthrough

- **WHEN** the save routes fail while the family walks a room
- **THEN** the walkthrough, corrections and lookups work as before, and the changes go up once the server answers again

#### Scenario: "Photo no longer on this device" is rare

- **WHEN** an original is gone from the phone but stored on the server, and the phone is online
- **THEN** the photo loads and the "Photo no longer on this device" state doesn't show
