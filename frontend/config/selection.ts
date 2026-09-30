import { AutomationStatusType, GlobalRoleType, MemberRoleType, TemplateType } from '@/types/base';
import { RunStatusType, TestRunCaseStatusType } from '@/types/status';
import { TestTypeType } from '@/types/testType';
import { PriorityType } from '@/types/priority';
import { LocaleType } from '@/types/locale';

const roles: GlobalRoleType[] = [{ uid: 'administrator' }, { uid: 'user' }];
const memberRoles: MemberRoleType[] = [{ uid: 'manager' }, { uid: 'developer' }, { uid: 'reporter' }];

const categoricalPalette = ['#fba91e', '#6ea56c', '#3ac6e1', '#feda2f', '#f15f47', '#244470', '#9c80bb', '#f595a6'];
const defaultTestTypeLabels = '功能,性能,健壮性,稳定性';

/**
 * Locales are grouped by script: Latin-based locales first, followed by CJK.
 * Within Latin-based group, entries are sorted lexicographically by their BCP 47 codes.
 * This matches common UI patterns.
 */
const locales: LocaleType[] = [
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
  { code: 'pt-BR', name: 'Português' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'ja', name: '日本語' },
];

// The status of each test run
const testRunStatus: RunStatusType[] = [
  { uid: 'new' },
  { uid: 'inProgress' },
  { uid: 'underReview' },
  { uid: 'rejected' },
  { uid: 'done' },
  { uid: 'closed' },
];

// The status of each test case in test run
const testRunCaseStatus: TestRunCaseStatusType[] = [
  {
    uid: 'untested',
    color: 'primary',
    chartColor: '#3ac6e1',
  },
  { uid: 'passed', color: 'success', chartColor: '#6ea56c' },
  { uid: 'failed', color: 'danger', chartColor: '#f15f47' },
  { uid: 'retest', color: 'warning', chartColor: '#fba91e' },
  { uid: 'skipped', color: 'primary', chartColor: '#805aab' },
];

const priorities: PriorityType[] = [
  { uid: 'critical', color: '#bb3e03', chartColor: '#bb3e03' },
  { uid: 'high', color: '#ca6702', chartColor: '#ca6702' },
  { uid: 'medium', color: '#ee9b00', chartColor: '#ee9b00' },
  { uid: 'low', color: '#94d2bd', chartColor: '#94d2bd' },
];

const testTypes: TestTypeType[] = (process.env.NEXT_PUBLIC_TEST_TYPES || defaultTestTypeLabels)
  .split(',')
  .map((label) => label.trim())
  .filter(Boolean)
  .map((label, index) => ({
    uid: label,
    label,
    chartColor: categoricalPalette[index % categoricalPalette.length],
  }));

const automationStatus: AutomationStatusType[] = [
  { uid: 'automated' },
  { uid: 'automation-not-required' },
  { uid: 'cannot-be-automated' },
  { uid: 'obsolete' },
];

const templates: TemplateType[] = [{ uid: 'text' }, { uid: 'step' }];

export {
  roles,
  memberRoles,
  locales,
  priorities,
  testTypes,
  automationStatus,
  templates,
  testRunStatus,
  testRunCaseStatus,
};
