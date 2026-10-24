CREATE TYPE "public"."blocking_pause_policy" AS ENUM('keep_blocking', 'pause_blocking');--> statement-breakpoint
CREATE TYPE "public"."blocking_schedule_mode" AS ENUM('focus_only', 'focus_and_breaks', 'always');--> statement-breakpoint
CREATE TABLE "blocked_domains" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"domain" text NOT NULL,
	"category" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distraction_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"schedule_mode" "blocking_schedule_mode" DEFAULT 'focus_only' NOT NULL,
	"pause_policy" "blocking_pause_policy" DEFAULT 'keep_blocking' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extension_pairing_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extension_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"name" text DEFAULT 'Chrome Extension' NOT NULL,
	"last_used_at" timestamp,
	"revoked_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocked_domains" ADD CONSTRAINT "blocked_domains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distraction_settings" ADD CONSTRAINT "distraction_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_pairing_codes" ADD CONSTRAINT "extension_pairing_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_tokens" ADD CONSTRAINT "extension_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blocked_domains_user_domain_idx" ON "blocked_domains" USING btree ("user_id","domain");--> statement-breakpoint
CREATE INDEX "blocked_domains_user_idx" ON "blocked_domains" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "distraction_settings_user_idx" ON "distraction_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "extension_pairing_codes_code_hash_idx" ON "extension_pairing_codes" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "extension_pairing_codes_user_idx" ON "extension_pairing_codes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "extension_tokens_token_hash_idx" ON "extension_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "extension_tokens_user_idx" ON "extension_tokens" USING btree ("user_id");