/**
 * Test file for packet reader
 * This can be used to test the parsing logic with sample text
 */

import { parsePacketText } from './packetReader';

// Sample text that might be extracted from a seed packet
const samplePacketText = `
BURPEE
TOMATO
CHERRY TOMATO
Packed for 2024

30 Seeds

Days to Germination: 10-20 days
Days to Maturity: 70-80 days

Planting Depth: 1/4 inch
Spacing: 12-18 inches apart

Full Sun

Plant after last frost date.
Start indoors 6-8 weeks before last frost.
`;

console.log('Testing packet text parsing...');
const result = parsePacketText(samplePacketText);
console.log('Extracted data:', JSON.stringify(result, null, 2));

