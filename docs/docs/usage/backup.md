---
sidebar_position: 2
---

# Backup

## Database backup

Test-platfrom uses PostgreSQL for data persistence. Use PostgreSQL backup tools such as `pg_dump` to create a database backup.

Keep database backups separate from the live database and verify that they can be restored.

:::note[In Docker environment]

In the included Docker Compose environment, PostgreSQL stores data in the `postgres-data` named volume.

:::

## Backup of uploaded files

Uploaded files are managed separately from the database. If you have uploaded files, you need to back them up too.

Please back up the files under the `backend/public/uploads` directory.
