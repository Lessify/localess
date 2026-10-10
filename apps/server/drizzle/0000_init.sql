CREATE TABLE "assets" (
	"id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"legacy_id" text,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"parent_path" text DEFAULT '' NOT NULL,
	"extension" text,
	"type" text,
	"size" bigint,
	"md5" text,
	"alt" text,
	"source" text,
	"metadata" jsonb,
	"in_progress" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_space_id_id_pk" PRIMARY KEY("space_id","id")
);
--> statement-breakpoint
CREATE TABLE "content_published" (
	"space_id" uuid NOT NULL,
	"content_id" text NOT NULL,
	"locale" text NOT NULL,
	"data" jsonb NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_published_space_id_content_id_locale_pk" PRIMARY KEY("space_id","content_id","locale")
);
--> statement-breakpoint
CREATE TABLE "contents" (
	"id" text NOT NULL,
	"space_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_slug" text DEFAULT '' NOT NULL,
	"full_slug" text NOT NULL,
	"schema" text,
	"data" jsonb,
	"assets" text[],
	"links" text[],
	"references" text[],
	"published_at" timestamp with time zone,
	"updated_by" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contents_space_id_id_pk" PRIMARY KEY("space_id","id")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schemas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"display_name" text,
	"description" text,
	"labels" text[],
	"preview_field" text,
	"fields" jsonb,
	"values" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'settings' NOT NULL,
	"ui" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"legacy_id" text,
	"name" text NOT NULL,
	"locales" jsonb NOT NULL,
	"locale_fallback" jsonb NOT NULL,
	"environments" jsonb,
	"overview" jsonb,
	"progress" jsonb,
	"content_version" bigint DEFAULT 1 NOT NULL,
	"translation_version" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spaces_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "task_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"trace" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"message" text,
	"trace" text,
	"path" text,
	"locale" text,
	"type" text,
	"file" jsonb,
	"locked_by" text,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"token" text NOT NULL,
	"name" text NOT NULL,
	"version" integer,
	"permissions" text[],
	"cache_ttl" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "translation_published" (
	"space_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"data" jsonb NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_published_space_id_locale_pk" PRIMARY KEY("space_id","locale")
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"key" text NOT NULL,
	"type" text NOT NULL,
	"locales" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"labels" text[],
	"description" text,
	"updated_by" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"hash_algo" text NOT NULL,
	"salt" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_identities" (
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_subject" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_identities_provider_provider_subject_pk" PRIMARY KEY("provider","provider_subject")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"legacy_id" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"display_name" text,
	"photo_url" text,
	"disabled" boolean DEFAULT false NOT NULL,
	"role" text,
	"permissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"lock" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event" text NOT NULL,
	"url" text NOT NULL,
	"status" text NOT NULL,
	"status_code" integer,
	"status_text" text,
	"error_type" text,
	"error_message" text,
	"request_size" integer NOT NULL,
	"data" jsonb NOT NULL,
	"delivery_id" text NOT NULL,
	"duration" integer NOT NULL,
	"response_body" text,
	"response_body_truncated" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"legacy_id" text,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"events" text[] NOT NULL,
	"headers" jsonb,
	"secret" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_published" ADD CONSTRAINT "content_published_space_id_content_id_contents_space_id_id_fk" FOREIGN KEY ("space_id","content_id") REFERENCES "public"."contents"("space_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schemas" ADD CONSTRAINT "schemas_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_logs" ADD CONSTRAINT "task_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_published" ADD CONSTRAINT "translation_published_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assets_legacy_idx" ON "assets" USING btree ("space_id","legacy_id");--> statement-breakpoint
CREATE INDEX "assets_parent_idx" ON "assets" USING btree ("space_id","parent_path","kind" DESC NULLS LAST,"name");--> statement-breakpoint
CREATE INDEX "assets_kind_idx" ON "assets" USING btree ("space_id","kind","name");--> statement-breakpoint
CREATE INDEX "assets_parent_path_prefix_idx" ON "assets" USING btree ("space_id","parent_path" text_pattern_ops);--> statement-breakpoint
CREATE INDEX "contents_parent_idx" ON "contents" USING btree ("space_id","parent_slug","kind" DESC NULLS LAST,"name");--> statement-breakpoint
CREATE INDEX "contents_kind_idx" ON "contents" USING btree ("space_id","kind","name");--> statement-breakpoint
CREATE INDEX "contents_full_slug_idx" ON "contents" USING btree ("space_id","full_slug" text_pattern_ops);--> statement-breakpoint
CREATE INDEX "contents_parent_slug_prefix_idx" ON "contents" USING btree ("space_id","parent_slug" text_pattern_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "schemas_name_idx" ON "schemas" USING btree ("space_id","name");--> statement-breakpoint
CREATE INDEX "schemas_type_idx" ON "schemas" USING btree ("space_id","type","display_name");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "spaces_name_idx" ON "spaces" USING btree ("name");--> statement-breakpoint
CREATE INDEX "task_logs_task_idx" ON "task_logs" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "tasks_space_idx" ON "tasks" USING btree ("space_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tasks_queue_idx" ON "tasks" USING btree ("created_at") WHERE "tasks"."status" = 'INITIATED';--> statement-breakpoint
CREATE INDEX "tokens_space_idx" ON "tokens" USING btree ("space_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tokens_permissions_idx" ON "tokens" USING gin ("permissions");--> statement-breakpoint
CREATE UNIQUE INDEX "translations_key_idx" ON "translations" USING btree ("space_id","key");--> statement-breakpoint
CREATE INDEX "user_identities_user_idx" ON "user_identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "webhook_logs_webhook_idx" ON "webhook_logs" USING btree ("webhook_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "webhooks_space_idx" ON "webhooks" USING btree ("space_id","name");--> statement-breakpoint
CREATE INDEX "webhooks_events_idx" ON "webhooks" USING gin ("events");--> statement-breakpoint
CREATE UNIQUE INDEX "webhooks_legacy_idx" ON "webhooks" USING btree ("space_id","legacy_id");