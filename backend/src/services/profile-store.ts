import type { FinancialProfile } from '../types';
import { createDemoProfile, DEMO_USER_ID } from '../utils/demo-data';

// ============================================================
// In-Memory Profile Store
// Fallback when PostgreSQL is unavailable (e.g. GreenNode single-container deploy).
// Profiles persist for the lifetime of the Node.js process.
// ============================================================

interface StoredProfile {
  profile: FinancialProfile;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const store = new Map<string, StoredProfile>();

// Always seed the demo profile into the store
function seedDemo(): void {
  if (!store.has(DEMO_USER_ID)) {
    const now = new Date().toISOString();
    store.set(DEMO_USER_ID, {
      profile: createDemoProfile(DEMO_USER_ID),
      name: 'Nguyễn Minh Anh (Demo)',
      createdAt: now,
      updatedAt: now,
    });
  }
}

seedDemo();

export function saveProfileToStore(
  userId: string,
  profile: FinancialProfile,
  name: string
): void {
  const existing = store.get(userId);
  const now = new Date().toISOString();
  store.set(userId, {
    profile,
    name,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}

export function getProfileFromStore(userId: string): FinancialProfile | null {
  const entry = store.get(userId);
  return entry ? entry.profile : null;
}

export function getProfileMetaFromStore(userId: string): StoredProfile | null {
  return store.get(userId) ?? null;
}

export function listProfilesFromStore(): Array<{
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  summary: { age: number; monthlyIncome: number; totalAssets: number; loanBalance: number };
}> {
  const profiles: Array<any> = [];
  for (const [userId, entry] of store.entries()) {
    const p = entry.profile;
    const totalAssets = p.assets.cash + p.assets.savings + p.assets.stocks + p.assets.realEstate + p.assets.other;
    profiles.push({
      userId,
      name: entry.name,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      summary: {
        age: p.personal.age,
        monthlyIncome: p.income.monthlyIncome,
        totalAssets,
        loanBalance: p.liabilities.loanBalance,
      },
    });
  }
  return profiles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deleteProfileFromStore(userId: string): boolean {
  if (userId === DEMO_USER_ID) return false; // Can't delete demo
  return store.delete(userId);
}

export function isDemoUserId(userId: string): boolean {
  return userId === DEMO_USER_ID || userId === 'demo';
}
