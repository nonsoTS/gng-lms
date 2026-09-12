ALTER TABLE "assets" ADD COLUMN "slide_keys_tmp" jsonb;--> statement-breakpoint
UPDATE "assets" SET "slide_keys_tmp" = (
  CASE
    WHEN "slide_keys" IS NULL THEN NULL
    ELSE COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('key', k, 'alt', '') ORDER BY ord)
       FROM unnest("slide_keys") WITH ORDINALITY AS t(k, ord)),
      '[]'::jsonb
    )
  END
);--> statement-breakpoint
ALTER TABLE "assets" DROP COLUMN "slide_keys";--> statement-breakpoint
ALTER TABLE "assets" RENAME COLUMN "slide_keys_tmp" TO "slide_keys";
