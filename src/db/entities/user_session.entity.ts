import {
  Entity,
  PrimaryKey,
  Property,
  UuidType,
  DateTimeType,
  TextType,
  ManyToOne,
  BooleanType,
  Unique,
} from '@mikro-orm/core';
import { generateUUID, getTimeAfterDays } from '@lib/utils';
import { User } from './user.entity';

interface UserSessionCreate {
  user: User;
  token: string;
  ipaddress: string;
  user_agent: string;
  location: string;
}

@Entity({ tableName: 'user_sessions' })
@Unique({ properties: ['token'] })
export class UserSession {
  @PrimaryKey({ type: UuidType })
  id: string = generateUUID();

  @ManyToOne(() => User)
  user!: User;

  @Property({ type: TextType })
  token!: string;

  @Property({ columnType: 'inet' })
  ipaddress!: string;

  @Property({ type: TextType })
  user_agent!: string;

  @Property({ type: TextType })
  location!: string;

  @Property({ type: BooleanType })
  removed: boolean = false;

  @Property({ type: DateTimeType })
  expires_at: Date = getTimeAfterDays();

  @Property({ type: DateTimeType })
  last_used_at: Date = new Date();

  @Property({ type: DateTimeType })
  ctime: Date = new Date();

  @Property({ type: DateTimeType, onUpdate: () => new Date() })
  mtime: Date = new Date();

  @Property({ type: DateTimeType, nullable: true })
  rtime?: Date;

  constructor({
    user,
    token,
    ipaddress,
    user_agent,
    location,
  }: UserSessionCreate) {
    this.user = user;
    this.token = token;
    this.ipaddress = ipaddress;
    this.user_agent = user_agent;
    this.location = location;
  }
}
