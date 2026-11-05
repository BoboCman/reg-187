-- Local check of the Illustration Companion migration (not for Supabase; it creates auth stubs).
-- Run against a throwaway Postgres 15+ database. Every statement that should fail prints an ERROR.
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
create role authenticated nologin; create role anon nologin; create role service_role nologin bypassrls;
grant usage on schema public, auth to authenticated, anon, service_role;
alter default privileges in schema public grant all on tables to authenticated, anon, service_role;
alter default privileges in schema public grant all on sequences to authenticated, anon, service_role;
grant execute on all functions in schema auth to authenticated, anon, service_role;
-- Apply the earlier migrations and 20261105000000_illustration_companion.sql here, then:
\set ON_ERROR_STOP 0
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
-- legacy row by an advisor (authenticated) still works
set role authenticated; select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
insert into policyplan_intakes (id, advisor_id, schema_version, payload) values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'v1', '{}');
update policyplan_intakes set status='draft' where id='aaaaaaaa-0000-0000-0000-000000000001';
select 'T1 legacy insert/update by advisor ok' where exists (select 1 from policyplan_intakes where id='aaaaaaaa-0000-0000-0000-000000000001' and case_type='reg187_letter');
-- advisor cannot create a companion row
insert into policyplan_intakes (advisor_id, schema_version, payload, case_type) values ('11111111-1111-1111-1111-111111111111', 'v1', '{}', 'illustration_companion');
-- advisor cannot flip a legacy row into a companion row
update policyplan_intakes set case_type='illustration_companion' where id='aaaaaaaa-0000-0000-0000-000000000001';
reset role;
-- service role writes companion rows
set role service_role; select set_config('request.jwt.claims', '{"role":"service_role"}', false);
insert into policyplan_intakes (id, advisor_id, schema_version, payload, case_type) values ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'companion.v1', '{}', 'illustration_companion');
insert into policyplan_outputs (id, intake_id, advisor_id, status, case_type, revision, job_id) values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'draft', 'illustration_companion', 1, gen_random_uuid());
update policyplan_outputs set status='final', companion='{"a":1}', approval='{"by":"x"}', content_hash='h', artifact_id='PPC-1' where id='cccccccc-0000-0000-0000-000000000001';
select 'T4 service role approved' where exists (select 1 from policyplan_outputs where status='final');
-- even the service role cannot change an approved snapshot
update policyplan_outputs set companion='{"a":2}' where id='cccccccc-0000-0000-0000-000000000001';
delete from policyplan_outputs where id='cccccccc-0000-0000-0000-000000000001';
update policyplan_outputs set status='draft' where id='cccccccc-0000-0000-0000-000000000001';
update policyplan_outputs set status='superseded', superseded_at=now() where id='cccccccc-0000-0000-0000-000000000001';
select 'T8 final -> superseded ok' where exists (select 1 from policyplan_outputs where status='superseded');
update policyplan_outputs set status='final' where id='cccccccc-0000-0000-0000-000000000001';
insert into policyplan_audit_events (case_id, advisor_id, event) values ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'case_created');
update policyplan_audit_events set event='x';
delete from policyplan_audit_events;
insert into policyplan_release_policies (advisor_id, external_client_export_allowed) values ('11111111-1111-1111-1111-111111111111', true);
reset role;
-- advisor reads own companion rows but cannot write them
set role authenticated; select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
select 'T12 advisor reads own companion case' where exists (select 1 from policyplan_intakes where id='bbbbbbbb-0000-0000-0000-000000000001');
select 'T13 advisor reads own audit + policy', (select count(*) from policyplan_audit_events), (select count(*) from policyplan_release_policies);
update policyplan_intakes set evidence='{}' where id='bbbbbbbb-0000-0000-0000-000000000001';
insert into policyplan_release_policies (advisor_id, external_client_export_allowed) values ('11111111-1111-1111-1111-111111111111', true) on conflict (advisor_id) do update set external_client_export_allowed = true;
-- other advisor sees nothing
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
select 'T16 other advisor sees', (select count(*) from policyplan_intakes), (select count(*) from policyplan_outputs), (select count(*) from policyplan_audit_events), (select count(*) from policyplan_release_policies);
