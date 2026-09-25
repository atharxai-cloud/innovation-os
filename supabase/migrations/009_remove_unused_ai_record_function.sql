-- Innovation OS
-- Migration 009: Remove superseded internal AI record helper

drop function if exists app_private.record_idea_xray_run(
  uuid,text,text,text,bigint,bigint,numeric,jsonb
);
