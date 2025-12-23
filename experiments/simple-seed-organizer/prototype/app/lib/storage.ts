import { Seed } from '@/types/seed';
import { UserProfile } from '@/types/profile';

const STORAGE_KEY = 'simple-seed-organizer-seeds';
const PROFILE_STORAGE_KEY = 'simple-seed-organizer-profile';

export function getSeeds(): Seed[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveSeed(seed: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'>): Seed {
  const seeds = getSeeds();
  const newSeed: Seed = {
    ...seed,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  seeds.push(newSeed);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
  return newSeed;
}

export function updateSeed(id: string, updates: Partial<Seed>): Seed | null {
  const seeds = getSeeds();
  const index = seeds.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  seeds[index] = {
    ...seeds[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
  return seeds[index];
}

export function deleteSeed(id: string): boolean {
  const seeds = getSeeds();
  const filtered = seeds.filter(s => s.id !== id);
  if (filtered.length === seeds.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function getSeedById(id: string): Seed | null {
  const seeds = getSeeds();
  return seeds.find(s => s.id === id) || null;
}

// Helper to calculate seed age in years
export function getSeedAge(seed: Seed): number {
  if (!seed.year) return 0;
  return new Date().getFullYear() - seed.year;
}

// Development helper: Seed sample data if storage is empty
export function seedSampleData(): void {
  if (typeof window === 'undefined') return;
  const existing = getSeeds();
  if (existing.length > 0) return; // Don't overwrite existing data

  const sampleSeeds: Seed[] = [
    {
      id: crypto.randomUUID(),
      name: "Tomato",
      variety: "Cherokee Purple",
      type: "vegetable",
      brand: "Baker Creek",
      year: 2022,
      quantity: "25 seeds",
      daysToGermination: "7-14",
      daysToMaturity: "80-90",
      sunRequirement: "full-sun",
      plantingMonths: [3, 4, 5],
      notes: "Heirloom variety, great flavor",
      useFirst: true,
      createdAt: new Date('2022-03-15').toISOString(),
      updatedAt: new Date('2022-03-15').toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Basil",
      variety: "Genovese",
      type: "herb",
      brand: "Burpee",
      year: 2024,
      quantity: "100 seeds",
      daysToGermination: "5-10",
      daysToMaturity: "60-75",
      sunRequirement: "full-sun",
      plantingMonths: [4, 5, 6, 7],
      notes: "Great for pesto",
      useFirst: false,
      createdAt: new Date('2024-04-01').toISOString(),
      updatedAt: new Date('2024-04-01').toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Zinnia",
      variety: "California Giant Mix",
      type: "flower",
      brand: "Johnny's Selected",
      year: 2023,
      quantity: "50 seeds",
      daysToGermination: "7-10",
      daysToMaturity: "75-90",
      sunRequirement: "full-sun",
      plantingMonths: [4, 5, 6],
      notes: "Bright colors, attracts butterflies",
      useFirst: false,
      createdAt: new Date('2023-05-10').toISOString(),
      updatedAt: new Date('2023-05-10').toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Lettuce",
      variety: "Buttercrunch",
      type: "vegetable",
      brand: "Ferry-Morse",
      year: 2021,
      quantity: "500 seeds",
      daysToGermination: "7-14",
      daysToMaturity: "55-65",
      sunRequirement: "partial-shade",
      plantingMonths: [3, 4, 9, 10],
      notes: "Heat tolerant, good for spring and fall",
      useFirst: true,
      createdAt: new Date('2021-09-20').toISOString(),
      updatedAt: new Date('2021-09-20').toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Pepper",
      variety: "Jalapeño",
      type: "vegetable",
      brand: "Burpee",
      year: 2024,
      quantity: "30 seeds",
      daysToGermination: "10-20",
      daysToMaturity: "70-80",
      sunRequirement: "full-sun",
      plantingMonths: [4, 5, 6],
      notes: "Medium heat, great for salsas",
      useFirst: false,
      createdAt: new Date('2024-05-15').toISOString(),
      updatedAt: new Date('2024-05-15').toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Carrot",
      variety: "Danvers 126",
      type: "vegetable",
      brand: "Baker Creek",
      year: 2023,
      quantity: "200 seeds",
      daysToGermination: "14-21",
      daysToMaturity: "75",
      sunRequirement: "full-sun",
      plantingMonths: [3, 4, 5, 7, 8],
      notes: "Classic orange, stores well",
      useFirst: false,
      createdAt: new Date('2023-04-05').toISOString(),
      updatedAt: new Date('2023-04-05').toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Sunflower",
      variety: "Mammoth",
      type: "flower",
      brand: "Johnny's Selected",
      year: 2022,
      quantity: "20 seeds",
      daysToGermination: "7-14",
      daysToMaturity: "80-100",
      sunRequirement: "full-sun",
      plantingMonths: [4, 5, 6],
      notes: "Grows 8-12 feet tall, great for birds",
      useFirst: true,
      createdAt: new Date('2022-05-01').toISOString(),
      updatedAt: new Date('2022-05-01').toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Cilantro",
      variety: "Slow Bolt",
      type: "herb",
      brand: "Burpee",
      year: 2024,
      quantity: "200 seeds",
      daysToGermination: "7-14",
      daysToMaturity: "45-55",
      sunRequirement: "partial-shade",
      plantingMonths: [3, 4, 9, 10],
      notes: "Resists bolting in heat",
      useFirst: false,
      createdAt: new Date('2024-03-20').toISOString(),
      updatedAt: new Date('2024-03-20').toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Beans",
      variety: "Blue Lake Bush",
      type: "vegetable",
      brand: "Ferry-Morse",
      year: 2020,
      quantity: "50 seeds",
      daysToGermination: "7-14",
      daysToMaturity: "50-60",
      sunRequirement: "full-sun",
      plantingMonths: [5, 6, 7],
      notes: "Old packet, should use soon",
      useFirst: true,
      createdAt: new Date('2020-06-10').toISOString(),
      updatedAt: new Date('2020-06-10').toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Marigold",
      variety: "French Dwarf",
      type: "flower",
      brand: "Baker Creek",
      year: 2024,
      quantity: "100 seeds",
      daysToGermination: "5-10",
      daysToMaturity: "50-60",
      sunRequirement: "full-sun",
      plantingMonths: [4, 5, 6],
      notes: "Pest deterrent, companion plant",
      useFirst: false,
      createdAt: new Date('2024-04-15').toISOString(),
      updatedAt: new Date('2024-04-15').toISOString()
    }
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleSeeds));
}

// Profile storage functions
export function getProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(PROFILE_STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveProfile(profile: Partial<UserProfile>): UserProfile {
  const existing = getProfile();
  const updated: UserProfile = {
    ...existing,
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
