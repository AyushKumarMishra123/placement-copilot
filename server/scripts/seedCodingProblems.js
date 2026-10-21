const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const CodingProblem = require('../models/CodingProblem');
const { CODING_PROBLEMS_BANK } = require('../data/codingProblemBank');
const problemValidationService = require('../services/coding/problemValidationService');

/**
 * Idempotent seeder that validates and seeds all 30 original coding problems
 */
async function seedCodingProblems({ verbose = true } = {}) {
  const log = (...args) => {
    if (verbose) console.log(...args);
  };

  log('\n======================================================');
  log('⚡ Starting Coding Assessment Problem Bank Validation & Seeding');
  log('======================================================\n');

  let validatedCount = 0;
  let draftCount = 0;
  const topicCounts = {};
  const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };
  const validationResults = [];

  for (let i = 0; i < CODING_PROBLEMS_BANK.length; i++) {
    const pDef = CODING_PROBLEMS_BANK[i];
    topicCounts[pDef.topic] = (topicCounts[pDef.topic] || 0) + 1;
    difficultyCounts[pDef.difficulty] = (difficultyCounts[pDef.difficulty] || 0) + 1;

    // Run automated validation pipeline against reference solution
    const validation = await problemValidationService.validateProblem(pDef);

    const isValid = validation.isValidated;
    if (isValid) {
      validatedCount++;
    } else {
      draftCount++;
    }

    validationResults.push({
      slug: pDef.slug,
      title: pDef.title,
      topic: pDef.topic,
      difficulty: pDef.difficulty,
      isValid,
      passedCount: validation.passedCount,
      totalCount: validation.totalCount,
      errors: validation.errors
    });

    log(
      `[${i + 1}/${CODING_PROBLEMS_BANK.length}] ${pDef.title} (${pDef.topic} | ${pDef.difficulty}): ` +
        (isValid
          ? `✅ VALIDATED (${validation.passedCount}/${validation.totalCount} tests passed)`
          : `⚠️ DRAFT - FAILED (${validation.passedCount}/${validation.totalCount} passed. ${validation.errors[0] || ''})`)
    );

    // Prepare Mongoose document
    const problemData = {
      slug: pDef.slug,
      title: pDef.title,
      topic: pDef.topic,
      difficulty: pDef.difficulty,
      description: pDef.description,
      constraints: pDef.constraints,
      hints: pDef.hints || [],
      timeLimitMs: pDef.timeLimitMs || 2000,
      maxScore: pDef.maxScore || 100,
      starterCode: pDef.starterCode,
      referenceSolution: pDef.referenceSolution,
      testCases: validation.verifiedTestCases || pDef.testCases,
      status: isValid ? 'active' : 'draft',
      isActive: isValid,
      isSeeded: true,
      validationStatus: {
        isValidated: isValid,
        validatedAt: new Date(),
        passedCount: validation.passedCount,
        totalCount: validation.totalCount,
        errors: validation.errors
      }
    };

    // Check if problem already exists (idempotent seed)
    const existing = await CodingProblem.findOne({ slug: pDef.slug });
    if (existing) {
      // If an administrator manually created or updated this problem (isSeeded === false),
      // we preserve the administrator's edits and do not overwrite.
      if (existing.isSeeded === false) {
        log(`   ↪ Preserving admin customized problem: ${existing.slug}`);
      } else {
        await CodingProblem.findByIdAndUpdate(existing._id, problemData, { new: true });
      }
    } else {
      await CodingProblem.create(problemData);
    }
  }

  log('\n======================================================');
  log('📊 CODING QUESTION BANK SUMMARY');
  log('======================================================');
  log(`Total Questions:       ${CODING_PROBLEMS_BANK.length}`);
  log(`Successfully Validated: ${validatedCount}`);
  log(`Flagged as Draft:      ${draftCount}`);
  log('\nDifficulty Distribution:');
  log(`  - Easy:   ${difficultyCounts.Easy}`);
  log(`  - Medium: ${difficultyCounts.Medium}`);
  log(`  - Hard:   ${difficultyCounts.Hard}`);
  log('\nTopic Distribution:');
  Object.entries(topicCounts).forEach(([top, count]) => {
    log(`  - ${top.padEnd(22)}: ${count} problems`);
  });
  log('======================================================\n');

  return {
    total: CODING_PROBLEMS_BANK.length,
    validatedCount,
    draftCount,
    difficultyCounts,
    topicCounts,
    validationResults
  };
}

// Run standalone if executed directly via node CLI
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedCodingProblems({ verbose: true });
      process.exit(0);
    } catch (err) {
      console.error('[Seed Error]:', err);
      process.exit(1);
    }
  })();
}

module.exports = { seedCodingProblems };
