#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/e7fb2110633867ba08bef5d35a7cd7d1b3f6aa574f7254e0340e5c2a25417d5c/contract';
import endContract from '../../snapshots/e7fb2110633867ba08bef5d35a7cd7d1b3f6aa574f7254e0340e5c2a25417d5c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'drillingParameter',
        columns: [
          col('depth', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('mudWeight', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('pressure', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('recordedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('rop', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('rpm', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('torque', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('wellId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('wob', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('username', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'well',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('formation', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('latitude', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('longitude', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('totalDepth', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('wellId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'wellEvent',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('endDepth', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('mitigation', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('severity', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('startDepth', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('wellId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'well',
        constraint: 'well_wellId_key',
        columns: ['wellId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'drillingParameter',
        index: 'drillingParameter_wellId_idx_efef2dbb',
        columns: ['wellId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'well',
        index: 'well_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'wellEvent',
        index: 'wellEvent_wellId_idx_efef2dbb',
        columns: ['wellId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'drillingParameter',
        foreignKey: {
          name: 'drillingParameter_wellId_fkey',
          columns: ['wellId'],
          references: { schema: 'public', table: 'well', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'well',
        foreignKey: {
          name: 'well_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'wellEvent',
        foreignKey: {
          name: 'wellEvent_wellId_fkey',
          columns: ['wellId'],
          references: { schema: 'public', table: 'well', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
