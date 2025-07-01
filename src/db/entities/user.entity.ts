import {
  Entity,
  PrimaryKey,
  Property,
  UuidType,
  BooleanType,
  DateTimeType,
  Unique,
  Index,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { generateUUID } from '@lib/utils';
import { UserSession } from './user_session.entity';

interface UserCreate {
  username?: string;
  email: string;
  password: string;
}

@Entity({ tableName: 'users' })
@Unique({ properties: ['username', 'email'] })
@Index({ properties: ['username', 'email'] })
export class User {
  @PrimaryKey({ type: UuidType })
  id: string = generateUUID();

  @OneToMany(() => UserSession, (session) => session.user)
  session = new Collection<UserSession>(this);

  @Property({ columnType: 'varchar(20)', nullable: true })
  username?: string;

  @Property({ columnType: 'varchar(50)' })
  email!: string;

  @Property({ columnType: 'varchar(140)' })
  password!: string;

  @Property({ type: BooleanType })
  verified: boolean = false;

  @Property({ type: BooleanType })
  removed: boolean = false;

  @Property({ type: DateTimeType, nullable: true })
  verified_at?: Date;

  @Property({ type: DateTimeType })
  ctime: Date = new Date();

  @Property({ type: DateTimeType, onUpdate: () => new Date() })
  mtime: Date = new Date();

  @Property({ type: DateTimeType, nullable: true })
  rtime?: Date;

  constructor({ username, email, password }: UserCreate) {
    this.username = username;
    this.email = email;
    this.password = password;
  }
}
