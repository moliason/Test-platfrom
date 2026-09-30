import { beforeEach, describe, expect, it, vi } from 'vitest';
import editableMiddleware from './verifyEditable.js';
import visibleMiddleware from './verifyVisible.js';

const mockProject = {
  findOne: vi.fn(),
  hasMany: vi.fn(),
};
const mockMember = {
  belongsTo: vi.fn(),
};
const mockFolder = {
  findByPk: vi.fn(),
};
const mockCase = {
  findByPk: vi.fn(),
};
const mockRun = {
  findByPk: vi.fn(),
};
const mockRunCase = {
  findByPk: vi.fn(),
};
const mockUser = {
  findByPk: vi.fn(),
};

vi.mock('../models/projects.js', () => ({
  default: () => mockProject,
}));

vi.mock('../models/members.js', () => ({
  default: () => mockMember,
}));

vi.mock('../models/folders.js', () => ({
  default: () => mockFolder,
}));

vi.mock('../models/cases.js', () => ({
  default: () => mockCase,
}));

vi.mock('../models/runs.js', () => ({
  default: () => mockRun,
}));

vi.mock('../models/runCases.js', () => ({
  default: () => mockRunCase,
}));

vi.mock('../models/users.js', () => ({
  default: () => mockUser,
}));

function makeReq(commentableType, commentableId, userId = 7) {
  return {
    query: { commentableType, commentableId },
    params: {},
    userId,
  };
}

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

describe('commentable permission checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.findByPk.mockResolvedValue({ id: 7, role: 1 });
  });

  it('rejects Case comments when the user is not in the project', async () => {
    const { verifyProjectReporterFromCommentableId } = editableMiddleware({});
    const req = makeReq('Case', 20);
    const res = makeRes();
    const next = vi.fn();

    mockCase.findByPk.mockResolvedValue({ id: 20, folderId: 3 });
    mockFolder.findByPk.mockResolvedValue({ id: 3, projectId: 10 });
    mockProject.findOne.mockResolvedValue({ id: 10, userId: 99, Members: [] });

    await verifyProjectReporterFromCommentableId(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects Run comments when the user is not in the project', async () => {
    const { verifyProjectReporterFromCommentableId } = editableMiddleware({});
    const req = makeReq('Run', 30);
    const res = makeRes();
    const next = vi.fn();

    mockRun.findByPk.mockResolvedValue({ id: 30, projectId: 10 });
    mockProject.findOne.mockResolvedValue({ id: 10, userId: 99, Members: [] });

    await verifyProjectReporterFromCommentableId(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows a developer to use reporter-level comment permission', async () => {
    const { verifyProjectReporterFromCommentableId } = editableMiddleware({});
    const req = makeReq('Run', 30);
    const res = makeRes();
    const next = vi.fn();

    mockRun.findByPk.mockResolvedValue({ id: 30, projectId: 10 });
    mockProject.findOne.mockResolvedValue({ id: 10, userId: 99, Members: [{ role: 1 }] });

    await verifyProjectReporterFromCommentableId(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows a global administrator to use reporter-level comment permission', async () => {
    const { verifyProjectReporterFromCommentableId } = editableMiddleware({});
    const req = makeReq('Run', 30);
    const res = makeRes();
    const next = vi.fn();

    mockUser.findByPk.mockResolvedValue({ id: 7, role: 0 });
    mockRun.findByPk.mockResolvedValue({ id: 30, projectId: 10 });
    mockProject.findOne.mockResolvedValue({ id: 10, userId: 99, Members: [] });

    await verifyProjectReporterFromCommentableId(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects private Case comment reads when the user cannot see the project', async () => {
    const { verifyProjectVisibleFromCommentableId } = visibleMiddleware({});
    const req = makeReq('Case', 20);
    const res = makeRes();
    const next = vi.fn();

    mockCase.findByPk.mockResolvedValue({ id: 20, folderId: 3 });
    mockFolder.findByPk.mockResolvedValue({ id: 3, projectId: 10 });
    mockProject.findOne.mockResolvedValue({ id: 10, isPublic: false, userId: 99, Members: [] });

    await verifyProjectVisibleFromCommentableId(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
