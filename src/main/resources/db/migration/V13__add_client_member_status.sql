alter table clients
    add column if not exists member_status varchar(20);

update clients
set member_status = 'CURRENT'
where member_status is null;

alter table clients
    alter column member_status set default 'CURRENT';

alter table clients
    alter column member_status set not null;

