create table if not exists report_photos (
    id uuid primary key,
    report_id uuid not null references reports(id) on delete cascade,
    file_name varchar(255) not null,
    content_type varchar(120) not null,
    storage_path varchar(1000) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_report_photos_report_created_at
    on report_photos(report_id, created_at desc);
