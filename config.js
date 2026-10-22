// Connection to the reviews database (Supabase). See README.md for the setup steps.
// Fill in both values from Supabase -> Project Settings -> API:
//   url     = "Project URL"          (looks like https://abcdxyz.supabase.co)
//   anonKey = "anon public" key      (this key is meant to be public)
// NEVER put the "service_role" key or any password here.
// While these are empty the site works as before: reviews are sent via WhatsApp / Viber / Telegram.
window.SUPABASE_CONFIG = {
  url: "",
  anonKey: ""
};
// Optional: window.SUPABASE_CONFIG.chatUrl overrides the AI assistant endpoint
// (default: <url>/functions/v1/chat). The chat button appears once url and anonKey are filled in.
