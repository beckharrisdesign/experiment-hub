import db from './db';
import { Pattern, Release } from '@/types';
import { randomUUID } from 'crypto';

export function getAllPatterns(): Pattern[] {
  const rows = db.prepare('SELECT * FROM patterns ORDER BY created_at DESC').all() as any[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    notes: row.notes || undefined,
    category: row.category || undefined,
    difficulty: row.difficulty as Pattern['difficulty'] || undefined,
    style: row.style || undefined,
    releaseId: row.release_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getPattern(id: string): Pattern | null {
  const row = db.prepare('SELECT * FROM patterns WHERE id = ?').get(id) as any;
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    notes: row.notes || undefined,
    category: row.category || undefined,
    difficulty: row.difficulty as Pattern['difficulty'] || undefined,
    style: row.style || undefined,
    releaseId: row.release_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createPattern(data: {
  name: string;
  notes?: string;
  category?: string;
  difficulty?: Pattern['difficulty'];
  style?: string;
}): Pattern {
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO patterns (id, name, notes, category, difficulty, style, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    data.notes || null,
    data.category || null,
    data.difficulty || null,
    data.style || null,
    now,
    now
  );

  return getPattern(id)!;
}

export function updatePattern(id: string, data: Partial<Pattern>): Pattern | null {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?');
    values.push(data.notes || null);
  }
  if (data.category !== undefined) {
    updates.push('category = ?');
    values.push(data.category || null);
  }
  if (data.difficulty !== undefined) {
    updates.push('difficulty = ?');
    values.push(data.difficulty || null);
  }
  if (data.style !== undefined) {
    updates.push('style = ?');
    values.push(data.style || null);
  }
  if (data.releaseId !== undefined) {
    updates.push('release_id = ?');
    values.push(data.releaseId || null);
  }

  if (updates.length === 0) {
    return getPattern(id);
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE patterns SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return getPattern(id);
}

export function deletePattern(id: string): boolean {
  const result = db.prepare('DELETE FROM patterns WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getAllReleases(): Release[] {
  const rows = db.prepare('SELECT * FROM releases ORDER BY release_date DESC, created_at DESC').all() as any[];
  return rows.map((row) => {
    const patternIds = db
      .prepare('SELECT id FROM patterns WHERE release_id = ?')
      .all(row.id)
      .map((p: any) => p.id);
    
    return {
      id: row.id,
      name: row.name,
      releaseDate: row.release_date || undefined,
      patternIds,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export function createRelease(data: { name: string; releaseDate?: string }): Release {
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO releases (id, name, release_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.name, data.releaseDate || null, now, now);

  return {
    id,
    name: data.name,
    releaseDate: data.releaseDate,
    patternIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

