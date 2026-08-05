/**
 * Verifies the Notion entity projection never leaks contact or account fields.
 *
 * The projected entities are interpolated into the OpenAI Vision prompt, so a
 * regression here ships household account numbers to a third party. Run this
 * after any change to entities-notion.js.
 *
 *   node testing/test-entity-projection.js
 */
import assert from 'assert';
import { projectEntity, shapeEntities, ALLOWED_PROPERTIES, DENIED_PROPERTIES } from '../lib/entities-notion.js';

const title = text => ({ title: [{ plain_text: text }] });
const richText = text => ({ rich_text: [{ plain_text: text }] });
const select = name => ({ select: { name } });
const multiSelect = names => ({ multi_select: names.map(name => ({ name })) });

// A Notion page carrying every sensitive field the real database has.
const sensitivePage = {
  properties: {
    Slug: title('firstname-m-lastname'),
    Name: richText('Firstname Lastname'),
    Aliases: richText('Firstname, Firstie'),
    Kind: select('Person'),
    Relationship: select('Self'),
    Category: multiSelect(['medical', 'financial']),
    Status: select('Active'),
    Location: select('location-somewhere-st'),
    // None of the following may appear in the output.
    'Account Number': richText('4111-1111-1111-1111'),
    Address: richText('123 Private Road'),
    Phone: { phone_number: '555-0100' },
    Email: { email: 'private@example.com' },
    Website: { url: 'https://bank.example.com/login' },
    Notes: richText('Sensitive free-text note')
  }
};

const entity = projectEntity(sensitivePage);
const serialized = JSON.stringify(entity);

const LEAK_MARKERS = [
  '4111-1111-1111-1111',
  '123 Private Road',
  '555-0100',
  'private@example.com',
  'bank.example.com',
  'Sensitive free-text note'
];

for (const marker of LEAK_MARKERS) {
  assert.ok(!serialized.includes(marker), `LEAK: projected entity contains "${marker}"`);
}

assert.strictEqual(entity.slug, 'firstname-m-lastname');
assert.strictEqual(entity.name, 'Firstname Lastname');
assert.deepStrictEqual(entity.aliases, ['Firstname', 'Firstie']);

// Alias separators are mixed in the real database: as of the migration, 28 of
// 47 aliased entities use semicolons and only 2 use commas. Splitting on comma
// alone collapses multi-alias rows into one unmatchable blob, which silently
// breaks abbreviation matching — the main thing aliases exist for.
assert.deepStrictEqual(
  projectEntity({
    properties: { Slug: title('s'), Aliases: richText('Alpha; Bravo; Charlie') }
  }).aliases,
  ['Alpha', 'Bravo', 'Charlie'],
  'semicolon-separated aliases must split'
);
assert.deepStrictEqual(
  projectEntity({
    properties: { Slug: title('s'), Aliases: richText('Alpha; Bravo, Charlie') }
  }).aliases,
  ['Alpha', 'Bravo', 'Charlie'],
  'mixed separators must split'
);
// Ampersands occur inside business names, not between them.
assert.deepStrictEqual(
  projectEntity({
    properties: { Slug: title('s'), Aliases: richText('Alpha & Bravo') }
  }).aliases,
  ['Alpha & Bravo'],
  'ampersand is part of a name, not a separator'
);
assert.strictEqual(entity.kind, 'Person');
assert.deepStrictEqual(entity.categories, ['medical', 'financial']);

// A property added to Notion but absent from the allowlist must not appear.
const pageWithNewColumn = {
  properties: {
    ...sensitivePage.properties,
    'Social Security Number': richText('000-00-0000')
  }
};
assert.ok(
  !JSON.stringify(projectEntity(pageWithNewColumn)).includes('000-00-0000'),
  'LEAK: a new Notion column reached the projection'
);

// Entities with no slug are unusable as tags and must be dropped.
assert.strictEqual(projectEntity({ properties: { Name: richText('No Slug') } }), null);

// Former entities drop out of suggestions but still contribute locations.
const shaped = shapeEntities([
  { slug: 'a-person', name: 'A', aliases: [], kind: 'Person', status: 'Active', location: 'loc-1', categories: [] },
  { slug: 'old-vendor', name: 'B', aliases: [], kind: 'Organization', status: 'Former', location: 'loc-2', categories: [] },
  { slug: 'cur-vendor', name: 'C', aliases: [], kind: 'Organization', status: 'Active', location: 'loc-1', categories: [] }
]);
assert.deepStrictEqual(shaped.people, ['a-person']);
assert.deepStrictEqual(shaped.vendors, ['cur-vendor'], 'Former entities must not be suggested');
assert.deepStrictEqual(shaped.locations, ['loc-1', 'loc-2'], 'Locations come from all entities');

assert.ok(ALLOWED_PROPERTIES.every(p => !DENIED_PROPERTIES.includes(p)), 'allow/deny lists overlap');

console.log('✓ entity projection: no contact or account data leaks');
console.log('✓ unknown Notion columns are ignored');
console.log('✓ aliases split on ; and , but not on & inside names');
console.log('✓ slugless entities dropped, Former entities excluded from suggestions');
