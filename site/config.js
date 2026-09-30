// Paste your Supabase project URL and anon (public) key here.
// Leave them empty to run in demo mode: data is kept in your browser only.
// The anon key is safe to publish; row-level security in supabase/schema.sql limits what it can do.
window.SS_CONFIG = {
  supabaseUrl: "https://xnyviiqwbnlycbegvamj.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhueXZpaXF3Ym5seWNiZWd2YW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTIzMTksImV4cCI6MjEwNjI4ODMxOX0.UobtWHh7k_gY6BnrSITosHEWbGSuNhW_wcQymrkWjRM",
  // A/B test on the claim button wording. Each user is assigned an arm permanently.
  experiment: {
    name: "claim_cta_v1",
    arms: { A: "Claim a portion", B: "Save me one" }
  }
};
