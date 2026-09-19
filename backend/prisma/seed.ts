import { prisma } from '../src/db/prisma';
import { createDemoProfile, DEMO_USER_ID } from '../src/utils/demo-data';

// ============================================================
// Database Seed — Load demo persona
// ============================================================

async function main() {
  console.log('Seeding database...');

  // Create demo user
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: { name: 'Nguyễn Minh Anh' },
    create: { id: DEMO_USER_ID, name: 'Nguyễn Minh Anh' },
  });

  // Delete existing profile
  await prisma.financialProfile.deleteMany({ where: { userId: DEMO_USER_ID } });

  // Create demo profile
  const demo = createDemoProfile(DEMO_USER_ID);
  const profile = await prisma.financialProfile.create({
    data: {
      userId: DEMO_USER_ID,
      age: demo.personal.age,
      maritalStatus: demo.personal.maritalStatus,
      dependents: demo.personal.dependents,
      monthlyIncome: demo.income.monthlyIncome,
      otherIncome: demo.income.otherIncome,
      housing: demo.expenses.housing,
      food: demo.expenses.food,
      transportation: demo.expenses.transportation,
      family: demo.expenses.family,
      entertainment: demo.expenses.entertainment,
      otherExpense: demo.expenses.other,
      cash: demo.assets.cash,
      savings: demo.assets.savings,
      stocks: demo.assets.stocks,
      realEstate: demo.assets.realEstate,
      otherAsset: demo.assets.other,
      loanBalance: demo.liabilities.loanBalance,
      interestRate: demo.liabilities.interestRate,
      monthlyRepayment: demo.liabilities.monthlyRepayment,
      goals: {
        create: demo.goals.map((g) => ({
          goalType: g.goalType,
          goalName: g.goalName,
          targetAmount: g.targetAmount,
          targetDate: new Date(g.targetDate),
          currentAllocated: g.currentAllocated ?? 0,
        })),
      },
    },
  });

  console.log(`Demo profile created: ${profile.id}`);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
