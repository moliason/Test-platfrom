import { readdirSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const migrationFilename = '20260716000000-expand-case-text-columns.js';

describe('long text columns migration', () => {
  it('expands case content and step details to TEXT', async () => {
    expect(readdirSync(new URL('./migrations/', import.meta.url))).toContain(migrationFilename);

    const { up } = await import(`./migrations/${migrationFilename}`);
    const queryInterface = { changeColumn: vi.fn().mockResolvedValue(undefined) };
    const Sequelize = { TEXT: Symbol('TEXT') };

    await up(queryInterface, Sequelize);

    expect(queryInterface.changeColumn.mock.calls).toEqual([
      ['cases', 'description', { type: Sequelize.TEXT, allowNull: true }],
      ['cases', 'preConditions', { type: Sequelize.TEXT, allowNull: true }],
      ['cases', 'expectedResults', { type: Sequelize.TEXT, allowNull: true }],
      ['steps', 'step', { type: Sequelize.TEXT, allowNull: false }],
      ['steps', 'result', { type: Sequelize.TEXT, allowNull: false }],
    ]);
  });

  it('restores the previous STRING column types on rollback', async () => {
    expect(readdirSync(new URL('./migrations/', import.meta.url))).toContain(migrationFilename);

    const { down } = await import(`./migrations/${migrationFilename}`);
    const queryInterface = { changeColumn: vi.fn().mockResolvedValue(undefined) };
    const Sequelize = { STRING: Symbol('STRING') };

    await down(queryInterface, Sequelize);

    expect(queryInterface.changeColumn.mock.calls).toEqual([
      ['cases', 'description', { type: Sequelize.STRING, allowNull: true }],
      ['cases', 'preConditions', { type: Sequelize.STRING, allowNull: true }],
      ['cases', 'expectedResults', { type: Sequelize.STRING, allowNull: true }],
      ['steps', 'step', { type: Sequelize.STRING, allowNull: false }],
      ['steps', 'result', { type: Sequelize.STRING, allowNull: false }],
    ]);
  });
});
