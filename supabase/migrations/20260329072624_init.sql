CREATE TABLE descartes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date date not null,
  product_code text not null,
  product_description text not null,
  condition text not null,
  lot text,
  brand text not null,
  quantity integer not null,
  media_urls text[]
);

ALTER TABLE descartes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert" ON descartes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON descartes FOR SELECT USING (true);
CREATE POLICY "Allow public update" ON descartes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON descartes FOR DELETE USING (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('descartes_media', 'descartes_media', true);

CREATE POLICY "Allow public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'descartes_media');
CREATE POLICY "Allow public view" ON storage.objects FOR SELECT USING (bucket_id = 'descartes_media');
CREATE POLICY "Allow public update" ON storage.objects FOR UPDATE USING (bucket_id = 'descartes_media');
CREATE POLICY "Allow public delete" ON storage.objects FOR DELETE USING (bucket_id = 'descartes_media');
