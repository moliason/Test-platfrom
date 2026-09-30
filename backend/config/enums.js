// Enum mappings for database numeric values to human-readable labels
// These correspond to the frontend config/selection.ts configurations

// The status of each test case in test run
const testRunCaseStatus = ['untested', 'passed', 'failed', 'retest', 'skipped'];

// The status of each test run
const testRunStatus = ['new', 'inProgress', 'underReview', 'rejected', 'done', 'closed'];

// Priority levels
const priorities = ['critical', 'high', 'medium', 'low'];

// Test types
const testTypes = (process.env.TEST_TYPES || '功能,性能,健壮性,稳定性')
  .split(',')
  .map((label) => label.trim())
  .filter(Boolean);

// Automation status
const automationStatus = ['automated', 'automation-not-required', 'cannot-be-automated', 'obsolete'];

// Templates
const templates = ['text', 'step'];

export { testRunCaseStatus, testRunStatus, priorities, testTypes, automationStatus, templates };
