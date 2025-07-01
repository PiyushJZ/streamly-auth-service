import { Migration } from '@mikro-orm/migrations';

export class Migration20250623203418 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create schema if not exists "dev";`);
    this.addSql(
      `create table "dev"."users" ("id" uuid not null, "username" varchar(20) null, "email" varchar(50) not null, "password" varchar(140) not null, "verified" boolean not null, "removed" boolean not null, "verified_at" timestamptz null, "ctime" timestamptz not null, "mtime" timestamptz not null, "rtime" timestamptz null, constraint "users_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create index "users_username_email_index" on "dev"."users" ("username", "email");`,
    );
    this.addSql(
      `alter table "dev"."users" add constraint "users_username_email_unique" unique ("username", "email");`,
    );

    this.addSql(
      `create table "dev"."user_sessions" ("id" uuid not null, "user_id" uuid not null, "token" text not null, "ipaddress" inet not null, "user_agent" text not null, "location" text not null, "removed" boolean not null, "expires_at" timestamptz not null, "last_used_at" timestamptz not null, "ctime" timestamptz not null, "mtime" timestamptz not null, "rtime" timestamptz null, constraint "user_sessions_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "dev"."user_sessions" add constraint "user_sessions_token_unique" unique ("token");`,
    );

    this.addSql(
      `alter table "dev"."user_sessions" add constraint "user_sessions_user_id_foreign" foreign key ("user_id") references "dev"."users" ("id") on update cascade;`,
    );
  }
}
