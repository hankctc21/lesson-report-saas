alter table clients
    add column if not exists preferred_lesson_type varchar(20);

