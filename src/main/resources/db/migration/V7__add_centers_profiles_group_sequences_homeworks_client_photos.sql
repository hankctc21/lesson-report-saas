create table if not exists centers (
    id uuid primary key,
    instructor_id uuid not null references instructors(id),
    name varchar(120) not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_centers_instructor_name unique (instructor_id, name)
);

alter table clients
    add column if not exists center_id uuid references centers(id);

insert into centers(id, instructor_id, name)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', '기본센터')
on conflict (id) do nothing;

update clients
set center_id = '22222222-2222-2222-2222-222222222221'
where center_id is null and instructor_id = '11111111-1111-1111-1111-111111111111';

create table if not exists client_profiles (
    client_id uuid primary key references clients(id) on delete cascade,
    pain_note varchar(1000),
    goal_note varchar(1000),
    surgery_history varchar(1000),
    before_class_memo varchar(1000),
    after_class_memo varchar(1000),
    next_lesson_plan varchar(1000),
    updated_at timestamptz not null default now()
);

create table if not exists homework_assignments (
    id uuid primary key,
    instructor_id uuid not null references instructors(id),
    client_id uuid not null references clients(id) on delete cascade,
    content varchar(1000) not null,
    remind_at timestamptz,
    notified_at timestamptz,
    completed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_homework_client_created_at on homework_assignments(client_id, created_at desc);
create index if not exists idx_homework_remind_at on homework_assignments(remind_at);

create table if not exists group_sequence_logs (
    id uuid primary key,
    instructor_id uuid not null references instructors(id),
    center_id uuid not null references centers(id),
    class_date date not null,
    equipment_brand varchar(120),
    spring_setting varchar(500),
    today_sequence varchar(2000),
    next_sequence varchar(2000),
    before_memo varchar(1000),
    after_memo varchar(1000),
    member_notes varchar(2000),
    created_at timestamptz not null default now()
);

create index if not exists idx_group_sequence_center_date on group_sequence_logs(center_id, class_date desc, created_at desc);

create table if not exists client_progress_photos (
    id uuid primary key,
    instructor_id uuid not null references instructors(id),
    client_id uuid not null references clients(id) on delete cascade,
    phase varchar(20) not null,
    note varchar(500),
    taken_on date,
    file_name varchar(255) not null,
    content_type varchar(120) not null,
    storage_path varchar(1000) not null,
    created_at timestamptz not null default now(),
    constraint chk_client_progress_phase check (phase in ('BEFORE', 'AFTER', 'ETC'))
);

create index if not exists idx_client_progress_photos_client_created_at on client_progress_photos(client_id, created_at desc);
