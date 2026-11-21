-- Skema idempoten untuk direktori kelas dan arsip publik Adiwiyata.
CREATE TABLE IF NOT EXISTS public.adiwiyata_classes (
  name text PRIMARY KEY,
  school_id text NOT NULL DEFAULT 'SMAN55',
  student_count integer CHECK (student_count IS NULL OR student_count BETWEEN 1 AND 100),
  homeroom_teacher text NOT NULL DEFAULT '',
  officer_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.adiwiyata_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Umum',
  blob_url text NOT NULL,
  blob_pathname text NOT NULL UNIQUE,
  content_type text NOT NULL,
  file_size bigint NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
