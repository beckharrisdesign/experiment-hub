import * as fs from 'fs';
import * as path from 'path';

interface USDAPlant {
  symbol: string;
  synonym_symbol: string;
  scientific_name: string;
  common_name: string;
  family: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const csvPath = path.join(process.cwd(), 'data', 'plantlst.txt');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

// Parse header
const header = parseCSVLine(lines[0]);
console.log('CSV Headers:', header);
console.log(`Total lines: ${lines.length}\n`);

// Parse records (skip header)
const records: USDAPlant[] = [];
for (let i = 1; i < Math.min(1000, lines.length); i++) { // Sample first 1000 for analysis
  const values = parseCSVLine(lines[i]);
  if (values.length >= 5) {
    records.push({
      symbol: values[0] || '',
      synonym_symbol: values[1] || '',
      scientific_name: values[2] || '',
      common_name: values[3] || '',
      family: values[4] || '',
    });
  }
}

// Analyze data quality
const withCommonName = records.filter(r => r.common_name && r.common_name.trim() !== '');
const withScientificName = records.filter(r => r.scientific_name && r.scientific_name.trim() !== '');
const uniqueFamilies = new Set(records.map(r => r.family).filter(Boolean));

console.log(`Sample records analyzed: ${records.length}`);
console.log(`Records with common name: ${withCommonName.length} (${(withCommonName.length / records.length * 100).toFixed(1)}%)`);
console.log(`Records with scientific name: ${withScientificName.length} (${(withScientificName.length / records.length * 100).toFixed(1)}%)`);
console.log(`Unique families in sample: ${uniqueFamilies.size}\n`);

// Sample records
console.log('Sample records:');
records.slice(0, 5).forEach((r, i) => {
  console.log(`\n${i + 1}. Symbol: ${r.symbol}`);
  console.log(`   Scientific: ${r.scientific_name.substring(0, 60)}${r.scientific_name.length > 60 ? '...' : ''}`);
  console.log(`   Common: ${r.common_name || '(none)'}`);
  console.log(`   Family: ${r.family || '(none)'}`);
});

// Check for our sample seeds
const sampleSeeds = [
  { name: 'Roma Tomato', latin: 'Solanum lycopersicum' },
  { name: 'Basil', latin: 'Ocimum basilicum' },
  { name: 'Zinnia', latin: 'Zinnia elegans' },
  { name: 'Lettuce', latin: 'Lactuca sativa' },
  { name: 'Cilantro', latin: 'Coriandrum sativum' },
];

console.log('\n\nLooking for sample seeds in first 1000 records:');
sampleSeeds.forEach(seed => {
  const matches = records.filter(r => 
    r.scientific_name.toLowerCase().includes(seed.latin.toLowerCase()) ||
    r.common_name.toLowerCase().includes(seed.name.toLowerCase())
  );
  if (matches.length > 0) {
    console.log(`\n✓ Found "${seed.name}":`);
    matches.forEach(m => {
      console.log(`  - ${m.symbol}: ${m.common_name || m.scientific_name.substring(0, 50)}`);
    });
  } else {
    console.log(`\n✗ Not found in sample: "${seed.name}" (${seed.latin})`);
  }
});

// Check full file for sample seeds
console.log('\n\nSearching full file for sample seeds...');
const fullContent = csvContent.toLowerCase();
sampleSeeds.forEach(seed => {
  const hasLatin = fullContent.includes(seed.latin.toLowerCase());
  const hasCommon = fullContent.includes(seed.name.toLowerCase());
  if (hasLatin || hasCommon) {
    console.log(`✓ "${seed.name}" appears in full dataset`);
  } else {
    console.log(`✗ "${seed.name}" not found in full dataset`);
  }
});

// Count total records
const totalRecords = lines.length - 1; // Exclude header
console.log(`\n\nTotal records in file: ${totalRecords.toLocaleString()}`);

