import { defineConfig, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import Config from '@lib/config';

export default defineConfig({
  driver: PostgreSqlDriver,
  entities: ['dist/db/entities/*.entity.js'],
  entitiesTs: ['src/db/entities/*.entity.ts'],
  dbName: Config['DB_NAME_AUTH'],
  user: Config['DB_USER'],
  password: Config['DB_PASS'],
  host: Config['DB_HOST'],
  port: Config['DB_PORT'],
  schema: Config['DB_SCHEMA'],
  loadStrategy: 'joined',
  debug: false,
  extensions: [Migrator],
  migrations: {
    path: 'dist/db/migrations',
    pathTs: 'src/db/migrations',
    glob: '!(*.d).{ts,js}',
    snapshot: true,
    tableName: 'MIGRATIONS',
    transactional: true,
    allOrNothing: true,
  },
  forceEntityConstructor: true,
  allowGlobalContext: false,
});
