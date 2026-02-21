create table instructors (
    id uuid primary key,
    email varchar(120) not null unique,
    display_name varchar(80) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table clients (
    id uuid primary key,
    instructor_id uuid not null references instructors(id),
    name varchar(80) not null,
    phone varchar(40),
    flags_note varchar(500),
    note varchar(1000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_clients_instructor_created_at on clients(instructor_id, created_at desc);

create table sessions (
    id uuid primary key,
    instructor_id uuid not null references instructors(id),
    client_id uuid not null references clients(id),
    session_date date not null,
    session_type varchar(20) not null,
    memo varchar(500),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint chk_session_type check (session_type in ('PERSONAL', 'GROUP'))
);

create index idx_sessions_instructor_date_created_at on sessions(instructor_id, session_date, created_at desc);

create table reports (
    id uuid primary key,
    instructor_id uuid not null references instructors(id),
    client_id uuid not null references clients(id),
    session_id uuid not null unique references sessions(id),
    summary_items varchar(1000),
    strength_note varchar(1000),
    improve_note varchar(1000),
    next_goal varchar(500),
    homework varchar(1000),
    pain_change varchar(500),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_reports_client_instructor_created_at on reports(client_id, instructor_id, created_at desc);

create table report_shares (
    id uuid primary key,
    report_id uuid not null references reports(id),
    token varchar(80) not null unique,
    expires_at timestamptz not null,
    revoked boolean not null default false,
    view_count integer not null default 0,
    last_viewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_report_shares_report_created_at on report_shares(report_id, created_at desc);

insert into instructors(id, email, display_name)
values ('11111111-1111-1111-1111-111111111111', 'owner@lessonreport.local', 'Default Owner');
