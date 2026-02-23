alter table sessions
    add column if not exists session_start_time time;
