create table if not exists client_tracking_logs (
    id uuid primary key,
    instructor_id uuid not null references instructors(id),
    client_id uuid not null references clients(id),
    pain_note varchar(1000),
    goal_note varchar(1000),
    surgery_history varchar(1000),
    before_class_memo varchar(1000),
    after_class_memo varchar(1000),
    next_lesson_plan varchar(1000),
    homework_given varchar(1000),
    homework_reminder_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_client_tracking_logs_client_instructor_created
    on client_tracking_logs(client_id, instructor_id, created_at desc);

