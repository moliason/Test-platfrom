import { expect, test } from '@playwright/test';

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('http://localhost:8000/zh-CN/account/signin');
  await page.getByRole('textbox', { name: '邮箱 邮箱*' }).fill(email);
  await page.getByRole('textbox', { name: '密码 密码' }).fill('666666');
  await page.getByRole('main').getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL('**/zh-CN/account');
}

test('reporters cannot open the case import action', async ({ page }) => {
  await signIn(page, 'perm_reporter@local');
  await page.goto('http://localhost:8000/zh-CN/projects/2/folders/4/cases');

  await expect(page.getByRole('button', { name: '导入', exact: true })).toBeDisabled();
});

test('unauthorized private project access shows an access message', async ({ page }) => {
  await signIn(page, 'perm_admin@local');

  for (const section of ['home', 'folders', 'runs', 'members', 'settings']) {
    await page.goto(`http://localhost:8000/zh-CN/projects/3/${section}`);
    await expect(page.getByText('无权访问此项目')).toBeVisible();
  }
});

test('public project case and run editors are read-only for non-members', async ({ page }) => {
  await signIn(page, 'perm_user@local');

  await page.goto('http://localhost:8000/zh-CN/projects/2/folders/4/cases/69');
  await expect(page.getByRole('textbox', { name: '标题 标题' })).toBeDisabled();
  await expect(page.getByRole('textbox', { name: '描述 描述' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '高 优先级' })).toHaveAttribute('data-disabled', 'true');
  await expect(page.getByRole('button', { name: '稳定性 类型' })).toHaveAttribute('data-disabled', 'true');
  await expect(page.getByRole('button', { name: '步骤 模板' })).toHaveAttribute('data-disabled', 'true');

  await page.goto('http://localhost:8000/zh-CN/projects/2/runs/3');
  await expect(page.getByRole('textbox', { name: '标题 标题' })).toBeDisabled();
  await expect(page.getByRole('textbox', { name: '描述 描述' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '进行中 状态' })).toHaveAttribute('data-disabled', 'true');
  await expect(
    page.getByRole('row', { name: '2', exact: true }).getByRole('button', { name: '未测试' })
  ).toBeDisabled();
});

test('reporters see a disabled assignee control', async ({ page }) => {
  await signIn(page, 'perm_reporter@local');
  await page.goto('http://localhost:8000/zh-CN/projects/2/runs/3');

  await expect(
    page.getByRole('row', { name: '2', exact: true }).getByRole('button', { name: '未分配' })
  ).toBeDisabled();
});

test('administrators can create an account with the selected role', async ({ page }) => {
  await signIn(page, 'admin666@local');
  await page.route('**/api/users', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 999,
          email: 'created-by-admin@example.com',
          username: 'created-by-admin',
          role: 0,
          avatarPath: null,
          locale: 'zh-CN',
        },
      }),
    });
  });
  await page.goto('http://localhost:8000/zh-CN/admin');

  await page.getByRole('button', { name: '创建账号', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '创建账号' });
  await dialog.getByRole('textbox', { name: /邮箱/ }).fill('created-by-admin@example.com');
  await dialog.getByRole('textbox', { name: /用户名/ }).fill('created-by-admin');
  await dialog.getByRole('textbox', { name: /初始密码/ }).fill('12345678');
  await dialog.getByRole('textbox', { name: /确认密码/ }).fill('12345678');
  await dialog.getByRole('radio', { name: '管理员', exact: true }).check();
  await dialog.getByRole('button', { name: '创建', exact: true }).click();

  const createdUserRow = page.getByRole('row').filter({ hasText: 'created-by-admin@example.com' });
  await expect(createdUserRow.getByText('管理员', { exact: true })).toBeVisible();
});
