-- Content and asset ids are only unique within a space (export/import upserts by id), so their keys
-- become (space_id, id). Hand-written: drizzle-kit cannot name the existing primary keys.
ALTER TABLE "content_published" DROP CONSTRAINT "content_published_content_id_contents_id_fk";--> statement-breakpoint
ALTER TABLE "content_published" DROP CONSTRAINT "content_published_content_id_locale_pk";--> statement-breakpoint
ALTER TABLE "assets" DROP CONSTRAINT "assets_pkey";--> statement-breakpoint
ALTER TABLE "contents" DROP CONSTRAINT "contents_pkey";--> statement-breakpoint
ALTER TABLE "content_published" ADD COLUMN "space_id" text;--> statement-breakpoint
UPDATE "content_published" cp SET "space_id" = c."space_id" FROM "contents" c WHERE c."id" = cp."content_id";--> statement-breakpoint
DELETE FROM "content_published" WHERE "space_id" IS NULL;--> statement-breakpoint
ALTER TABLE "content_published" ALTER COLUMN "space_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_space_id_id_pk" PRIMARY KEY("space_id","id");--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_space_id_id_pk" PRIMARY KEY("space_id","id");--> statement-breakpoint
ALTER TABLE "content_published" ADD CONSTRAINT "content_published_space_id_content_id_locale_pk" PRIMARY KEY("space_id","content_id","locale");--> statement-breakpoint
ALTER TABLE "content_published" ADD CONSTRAINT "content_published_space_id_content_id_contents_space_id_id_fk" FOREIGN KEY ("space_id","content_id") REFERENCES "public"."contents"("space_id","id") ON DELETE cascade ON UPDATE no action;
