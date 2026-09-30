'use client';
import { useState, useEffect, useContext } from 'react';
import { Button, Input, Chip, Select, SelectItem, addToast } from '@heroui/react';
import UsersTable from './UsersTable';
import PasswordResetDialog from './PasswordResetDialog';
import CreateUserDialog from './CreateUserDialog';
import { UserType, AdminMessages } from '@/types/user';
import { CaseTypeOption } from '@/types/testType';
import { ProjectType } from '@/types/project';
import { TokenContext } from '@/utils/TokenProvider';
import Config from '@/config/config';
import { adminCreateUser, updateUserRole, adminResetPassword } from '@/utils/usersControl';
import { fetchProjects } from '@/utils/projectsControl';
import { fetchCaseTypes, createCaseType, deleteCaseType } from '@/utils/caseTypesControls';
import { logError } from '@/utils/errorHandler';
import { Plus } from 'lucide-react';
const apiServer = Config.apiServer;

type Props = {
  messages: AdminMessages;
};

async function fetchUsers(jwt: string) {
  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  };

  const url = `${apiServer}/users`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error: unknown) {
    logError('Error fetching data:', error);
  }
}

export default function AdminPage({ messages }: Props) {
  const tokenContext = useContext(TokenContext);
  const [users, setUsers] = useState<UserType[]>([]);
  const [myself, setMyself] = useState<UserType | null>(null);
  const [caseTypes, setCaseTypes] = useState<CaseTypeOption[]>([]);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [newCaseTypeName, setNewCaseTypeName] = useState('');
  const [isCreatingCaseType, setIsCreatingCaseType] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    async function fetchDataEffect() {
      if (!tokenContext.isAdmin()) {
        return;
      }

      try {
        const [data, projectData] = await Promise.all([
          fetchUsers(tokenContext.token.access_token),
          fetchProjects(tokenContext.token.access_token),
        ]);
        setUsers(data || []);
        const availableProjects: ProjectType[] = projectData || [];
        setProjects(availableProjects);
        setSelectedProjectId((current) => current ?? availableProjects[0]?.id ?? null);

        if (tokenContext.token.user) {
          setMyself(tokenContext.token.user);
        }
      } catch (error: unknown) {
        logError('Error fetching users:', error);
      }
    }

    fetchDataEffect();
  }, [tokenContext]);

  useEffect(() => {
    if (!tokenContext.isAdmin() || selectedProjectId === null) {
      setCaseTypes([]);
      return;
    }

    let cancelled = false;
    fetchCaseTypes(tokenContext.token.access_token, selectedProjectId).then((data) => {
      if (!cancelled) {
        setCaseTypes(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tokenContext, selectedProjectId]);

  const handleChangeRole = async (userEdit: UserType, role: number) => {
    if (!tokenContext.isAdmin()) {
      console.error('you are not admin');
      return;
    }

    if (userEdit.id) {
      const data = await updateUserRole(tokenContext.token.access_token, userEdit.id, role);
      if (data.user) {
        addToast({
          title: 'Success',
          color: 'success',
          description: messages.roleChanged,
        });
        setUsers((prevUsers) => {
          return prevUsers.map((user) => {
            if (user.id === userEdit.id) {
              return { ...user, role: role };
            }
            return user;
          });
        });
      }
    }
  };

  const handleCreateUser = async (newUser: Pick<UserType, 'email' | 'username' | 'password' | 'role'>) => {
    setIsCreatingUser(true);
    try {
      const data = await adminCreateUser(tokenContext.token.access_token, newUser);
      setUsers((current) => [...current, data.user]);
      setIsCreateUserDialogOpen(false);
      addToast({ title: messages.accountCreated, color: 'success' });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const onCreateCaseType = async () => {
    if (!tokenContext.isAdmin() || selectedProjectId === null) {
      return;
    }

    const name = newCaseTypeName.trim();
    if (!name) {
      addToast({ title: 'Error', color: 'danger', description: '类型名称不能为空' });
      return;
    }

    setIsCreatingCaseType(true);
    try {
      const created = await createCaseType(tokenContext.token.access_token, selectedProjectId, name);
      setCaseTypes((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));
      setNewCaseTypeName('');
      addToast({ title: 'Success', color: 'success', description: '类型已新增' });
    } catch (error: unknown) {
      logError('Failed to create case type', error);
      addToast({ title: 'Error', color: 'danger', description: '类型新增失败，名称不能重复' });
    } finally {
      setIsCreatingCaseType(false);
    }
  };

  const onDeleteCaseType = async (caseType: CaseTypeOption) => {
    if (!tokenContext.isAdmin() || caseType.projectId === null) {
      return;
    }

    try {
      await deleteCaseType(tokenContext.token.access_token, caseType.id);
      setCaseTypes((prev) => prev.filter((entry) => entry.id !== caseType.id));
      addToast({ title: 'Success', color: 'success', description: '类型已删除' });
    } catch (error: unknown) {
      logError('Failed to delete case type', error);
      addToast({ title: 'Error', color: 'danger', description: '类型删除失败，可能已有用例在使用' });
    }
  };

  // Reset password dialog state
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserType | null>(null);

  const openResetDialog = (user: UserType) => {
    setResetTarget(user);
    setIsResetDialogOpen(true);
  };

  const onReset = async (newPassword: string) => {
    setIsResetDialogOpen(false);
    if (!resetTarget || !resetTarget.id) return;

    try {
      await adminResetPassword(tokenContext.token.access_token, resetTarget.id, newPassword);
      addToast({ title: 'Success', color: 'success', description: 'Password updated' });
      setResetTarget(null);
    } catch (error: unknown) {
      logError('Failed to reset password', error);
    }
  };

  if (!tokenContext.isAdmin()) {
    return null;
  }

  return (
    <>
      <div className="container mx-auto max-w-3xl pt-16 px-6 flex-grow">
        <div className="w-full p-3 flex items-center justify-between">
          <h3 className="font-bold">{messages.userManagement}</h3>
          <Button
            color="primary"
            size="sm"
            startContent={<Plus size={16} />}
            onPress={() => setIsCreateUserDialogOpen(true)}
          >
            {messages.createUser}
          </Button>
        </div>

        <UsersTable
          users={users}
          myself={myself}
          onChangeRole={handleChangeRole}
          openResetDialog={openResetDialog}
          messages={messages}
        />
        <div className="w-full p-3 mt-8">
          <h3 className="font-bold mb-3">类型管理</h3>
          <Select
            size="sm"
            variant="bordered"
            label="项目"
            selectedKeys={selectedProjectId === null ? [] : [String(selectedProjectId)]}
            onSelectionChange={(selection) => {
              if (selection !== 'all' && selection.size > 0) {
                setSelectedProjectId(Number(Array.from(selection)[0]));
              }
            }}
            isDisabled={projects.length === 0}
            className="mb-3 max-w-sm"
          >
            {projects.map((project) => (
              <SelectItem key={String(project.id)}>{project.name}</SelectItem>
            ))}
          </Select>
          <div className="flex gap-2 items-end">
            <Input
              size="sm"
              variant="bordered"
              label="类型名称"
              value={newCaseTypeName}
              maxLength={20}
              onValueChange={setNewCaseTypeName}
            />
            <Button
              size="sm"
              color="primary"
              isLoading={isCreatingCaseType}
              isDisabled={!newCaseTypeName.trim() || selectedProjectId === null}
              onPress={onCreateCaseType}
            >
              新增
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap mt-3">
            {caseTypes.map((caseType) => (
              <Chip
                key={caseType.id}
                size="sm"
                variant="flat"
                onClose={caseType.projectId === null ? undefined : () => onDeleteCaseType(caseType)}
              >
                {caseType.name}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <PasswordResetDialog
        isOpen={isResetDialogOpen}
        onCancel={() => setIsResetDialogOpen(false)}
        onReset={onReset}
        messages={messages}
      />
      <CreateUserDialog
        isOpen={isCreateUserDialogOpen}
        isCreating={isCreatingUser}
        onCancel={() => setIsCreateUserDialogOpen(false)}
        onCreate={handleCreateUser}
        messages={messages}
      />
    </>
  );
}
