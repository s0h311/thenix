CREATE TABLE "day" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"kind" text NOT NULL,
	"focus" text,
	"notes" text,
	CONSTRAINT "day_week_ordinal_unique" UNIQUE("week_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE "exercise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"key" text NOT NULL,
	"movement_id" text NOT NULL,
	"name" text NOT NULL,
	"variant" text,
	"side" text NOT NULL,
	"optional" boolean NOT NULL,
	"to_failure" boolean NOT NULL,
	"prescription" jsonb NOT NULL,
	"load" jsonb,
	"tempo" text,
	"rest_seconds" jsonb,
	"cue" text,
	"raw" text NOT NULL,
	CONSTRAINT "exercise_day_key_unique" UNIQUE("day_id","key")
);
--> statement-breakpoint
CREATE TABLE "movement" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "week" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"number" integer NOT NULL,
	"start_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "week_user_number_unique" UNIQUE("user_id","number")
);
--> statement-breakpoint
ALTER TABLE "day" ADD CONSTRAINT "day_week_id_week_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."week"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_day_id_day_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."day"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_movement_id_movement_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."movement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week" ADD CONSTRAINT "week_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_movementId_idx" ON "exercise" USING btree ("movement_id");--> statement-breakpoint
CREATE INDEX "exercise_side_idx" ON "exercise" USING btree ("side");