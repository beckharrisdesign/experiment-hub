import db from '../lib/db';

// Sample seeds data
const sampleSeeds = [
  {
    id: '1',
    english_name: 'Roma Tomato',
    latin_name: 'Solanum lycopersicum',
    category: 'vegetable',
    hardiness_zones: JSON.stringify([5, 6, 7, 8, 9, 10])
  },
  {
    id: '2',
    english_name: 'Genovese Basil',
    latin_name: 'Ocimum basilicum',
    category: 'herb',
    hardiness_zones: JSON.stringify([4, 5, 6, 7, 8, 9, 10])
    // Note: Genovese Basil is a cultivar of Ocimum basilicum
    // Other cultivars include: Thai Basil, Lemon Basil, Purple Basil, etc.
  },
  {
    id: '3',
    english_name: 'Zinnia',
    latin_name: 'Zinnia elegans',
    category: 'flower',
    hardiness_zones: JSON.stringify([3, 4, 5, 6, 7, 8, 9, 10])
  },
  {
    id: '4',
    english_name: 'Lettuce',
    latin_name: 'Lactuca sativa',
    category: 'vegetable',
    hardiness_zones: JSON.stringify([4, 5, 6, 7, 8, 9, 10])
  },
  {
    id: '5',
    english_name: 'Cilantro',
    latin_name: 'Coriandrum sativum',
    category: 'herb',
    hardiness_zones: JSON.stringify([2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  },
  {
    id: '6',
    english_name: 'Marigold',
    latin_name: 'Tagetes patula',
    category: 'flower',
    hardiness_zones: JSON.stringify([2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  },
  {
    id: '7',
    english_name: 'Bell Pepper',
    latin_name: 'Capsicum annuum',
    category: 'vegetable',
    hardiness_zones: JSON.stringify([9, 10, 11])
  },
  {
    id: '8',
    english_name: 'Oregano',
    latin_name: 'Origanum vulgare',
    category: 'herb',
    hardiness_zones: JSON.stringify([4, 5, 6, 7, 8, 9, 10])
  },
  {
    id: '9',
    english_name: 'Sunflower',
    latin_name: 'Helianthus annuus',
    category: 'flower',
    hardiness_zones: JSON.stringify([2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  },
  {
    id: '10',
    english_name: 'Carrot',
    latin_name: 'Daucus carota',
    category: 'vegetable',
    hardiness_zones: JSON.stringify([3, 4, 5, 6, 7, 8, 9, 10])
  },
  {
    id: '11',
    english_name: 'Thyme',
    latin_name: 'Thymus vulgaris',
    category: 'herb',
    hardiness_zones: JSON.stringify([5, 6, 7, 8, 9, 10])
  },
  {
    id: '12',
    english_name: 'Nasturtium',
    latin_name: 'Tropaeolum majus',
    category: 'flower',
    hardiness_zones: JSON.stringify([9, 10, 11])
  },
  {
    id: '13',
    english_name: 'Cucumber',
    latin_name: 'Cucumis sativus',
    category: 'vegetable',
    hardiness_zones: JSON.stringify([4, 5, 6, 7, 8, 9, 10])
  },
  {
    id: '14',
    english_name: 'Parsley',
    latin_name: 'Petroselinum crispum',
    category: 'herb',
    hardiness_zones: JSON.stringify([2, 3, 4, 5, 6, 7, 8, 9, 10])
  },
  {
    id: '15',
    english_name: 'Cosmos',
    latin_name: 'Cosmos bipinnatus',
    category: 'flower',
    hardiness_zones: JSON.stringify([2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  }
];

// Sample zip codes
const sampleZips = [
  { zip_code: '90210', hardiness_zone: 10, city: 'Beverly Hills', state: 'CA' },
  { zip_code: '90012', hardiness_zone: 10, city: 'Los Angeles', state: 'CA' },
  { zip_code: '10001', hardiness_zone: 7, city: 'New York', state: 'NY' },
  { zip_code: '60601', hardiness_zone: 6, city: 'Chicago', state: 'IL' },
  { zip_code: '77001', hardiness_zone: 9, city: 'Houston', state: 'TX' },
  { zip_code: '33101', hardiness_zone: 11, city: 'Miami', state: 'FL' },
  { zip_code: '98101', hardiness_zone: 8, city: 'Seattle', state: 'WA' },
  { zip_code: '80202', hardiness_zone: 5, city: 'Denver', state: 'CO' },
  { zip_code: '78701', hardiness_zone: 9, city: 'Austin', state: 'TX' },
  { zip_code: '78726', hardiness_zone: 9, city: 'Austin', state: 'TX' },
  { zip_code: '02101', hardiness_zone: 6, city: 'Boston', state: 'MA' },
  { zip_code: '30301', hardiness_zone: 8, city: 'Atlanta', state: 'GA' },
  { zip_code: '97201', hardiness_zone: 8, city: 'Portland', state: 'OR' },
  { zip_code: '55401', hardiness_zone: 4, city: 'Minneapolis', state: 'MN' },
  { zip_code: '53201', hardiness_zone: 5, city: 'Milwaukee', state: 'WI' },
  { zip_code: '70112', hardiness_zone: 9, city: 'New Orleans', state: 'LA' }
];

// Insert data
const insertSeed = db.prepare(`
  INSERT OR REPLACE INTO seeds (id, english_name, latin_name, category, hardiness_zones)
  VALUES (?, ?, ?, ?, ?)
`);

const insertZip = db.prepare(`
  INSERT OR REPLACE INTO zip_hardiness (zip_code, hardiness_zone, city, state)
  VALUES (?, ?, ?, ?)
`);

const transaction = db.transaction(() => {
  sampleSeeds.forEach(seed => {
    insertSeed.run(seed.id, seed.english_name, seed.latin_name, seed.category, seed.hardiness_zones);
  });

  sampleZips.forEach(zip => {
    insertZip.run(zip.zip_code, zip.hardiness_zone, zip.city, zip.state);
  });
});

transaction();

console.log('✅ Database seeded with sample data');
console.log(`   - ${sampleSeeds.length} seeds added`);
console.log(`   - ${sampleZips.length} zip codes added`);

