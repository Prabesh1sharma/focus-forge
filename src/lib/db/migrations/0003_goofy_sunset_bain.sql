DROP INDEX "room_join_requests_room_user_pending_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "room_join_requests_room_user_idx" ON "room_join_requests" USING btree ("room_id","user_id");