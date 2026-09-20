CREATE TABLE "log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"skipped" boolean DEFAULT false NOT NULL,
	"difficulty" text,
	"note" text,
	"logged_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "log_exercise_unique" UNIQUE("exercise_id")
);
--> statement-breakpoint
ALTER TABLE "log" ADD CONSTRAINT "log_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE cascade ON UPDATE no action;