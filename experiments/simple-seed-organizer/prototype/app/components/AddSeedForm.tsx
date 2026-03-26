'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Seed, SeedType, SunRequirement } from '@/types/seed';
import { AIExtractedData } from '@/lib/packetReaderAI';
import { processImageFile } from '@/lib/imageUtils';
import { uploadSeedPhoto } from '@/lib/seed-photos';