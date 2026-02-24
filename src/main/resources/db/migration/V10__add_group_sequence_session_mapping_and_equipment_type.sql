alter table group_sequence_logs
    add column if not exists session_id uuid references sessions(id);

alter table group_sequence_logs
    add column if not exists equipment_type varchar(40);

create index if not exists idx_group_sequence_session_id
    on group_sequence_logs(session_id);
