alter table group_sequence_logs
    add column if not exists lesson_type varchar(20) not null default 'GROUP';

alter table group_sequence_logs
    drop constraint if exists chk_group_sequence_lesson_type;

alter table group_sequence_logs
    add constraint chk_group_sequence_lesson_type
    check (lesson_type in ('PERSONAL', 'GROUP'));

create table if not exists group_sequence_templates (
    id uuid primary key,
    instructor_id uuid not null references instructors(id),
    center_id uuid not null references centers(id),
    lesson_type varchar(20) not null,
    title varchar(120) not null,
    equipment_brand varchar(120),
    spring_setting varchar(500),
    sequence_body varchar(3000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint chk_group_sequence_template_lesson_type check (lesson_type in ('PERSONAL', 'GROUP'))
);

create index if not exists idx_group_sequence_templates_center_lesson
    on group_sequence_templates(center_id, lesson_type, created_at desc);
