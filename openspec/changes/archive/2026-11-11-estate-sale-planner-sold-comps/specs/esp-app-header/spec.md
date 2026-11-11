## Outcomes

See `../../proposal.md`. The header's "Account & profile" panel stops being empty: it holds the
first per-person setting, the sold-price lookup threshold (review queue #59; founder,
2026-10-31: "Tokenize that choice - and put it in my profile"). Done when the panel shows the
threshold at the $100 default, a change is saved on the device and is still there next time,
and the panel still has no explanatory copy. Not doing: accounts or sign-in (#50), any other
setting.

## MODIFIED Requirements

### Requirement: The menu opens a placeholder and nothing else

Tapping the menu opens the "Account & profile" panel, which holds settings that belong to the
person, not to one sale, and closes without side effects.

The Menu button SHALL open a dismissible panel headed "Account & profile" with a Close button
and the person's settings, and no explanatory copy, closable by its close button, Escape, or
tapping outside, with focus returned to the Menu button on close. Its first setting SHALL be
"Look up sold prices for", a single-select of $25+, $100+ and $500+ (`COMPS.minBandChoices`)
that starts at $100+ (`COMPS.minBand`) and is saved on the device until accounts exist.

#### Scenario: Open and close the placeholder

- **WHEN** the family taps Menu
- **THEN** a panel headed "Account & profile" opens with a Close button and the lookup threshold, and closing it (close button, Escape, or tapping outside) returns focus to Menu and changes nothing else

#### Scenario: Change the lookup threshold

- **WHEN** the family picks $500+ in the panel
- **THEN** it is saved on the device, the next time the panel opens it shows $500+, and later lookups only run for $500-and-up items
