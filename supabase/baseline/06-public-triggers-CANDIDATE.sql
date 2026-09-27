-- Momo v2.15 / application AFTER INSERT triggers captured from production.
-- NEW, EMPTY Supabase STAGING ONLY. Requires 05-public-functions-CANDIDATE.sql.
BEGIN;
CREATE TRIGGER organizations_create_default_agent_config AFTER INSERT ON organizations FOR EACH ROW EXECUTE FUNCTION create_default_agent_config();
CREATE TRIGGER organizations_create_default_widget_config AFTER INSERT ON organizations FOR EACH ROW EXECUTE FUNCTION create_default_widget_config();
COMMIT;
