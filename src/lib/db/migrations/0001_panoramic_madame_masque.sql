CREATE TYPE "public"."join_request_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled');--> statement-breakpoint
CREATE TABLE "room_join_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "join_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"responded_by" text
);
--> statement-breakpoint
ALTER TABLE "room_join_requests" ADD CONSTRAINT "room_join_requests_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_join_requests" ADD CONSTRAINT "room_join_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_join_requests" ADD CONSTRAINT "room_join_requests_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "room_join_requests_room_user_idx" ON "room_join_requests" USING btree ("room_id","user_id");--> statement-breakpoint
CREATE INDEX "room_join_requests_user_idx" ON "room_join_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "room_join_requests_room_idx" ON "room_join_requests" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "room_join_requests_room_status_idx" ON "room_join_requests" USING btree ("room_id","status");