create table auth_users (
    id uuid primary key,
    username varchar(80) not null unique,
    password varchar(120) not null,
    instructor_id uuid not null references instructors(id)
);

insert into auth_users(id, username, password, instructor_id)
values ('22222222-2222-2222-2222-222222222222', 'admin', 'change_this_in_prod', '11111111-1111-1111-1111-111111111111')
on conflict (username) do nothing;
