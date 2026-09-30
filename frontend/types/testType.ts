type TestTypeUidType = string;

type TestTypeType = {
  uid: TestTypeUidType;
  label: string;
  chartColor: string;
};

type TestTypeMessages = Record<string, string>;

type CaseTypeOption = {
  id: number;
  name: string;
  sortOrder: number;
  projectId: number | null;
};

export type { TestTypeUidType, TestTypeType, TestTypeMessages, CaseTypeOption };
