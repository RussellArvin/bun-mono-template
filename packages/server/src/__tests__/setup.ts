// Preloaded by bunfig.toml so every test inherits the same env without
// per-file boilerplate. Override per-test with process.env assignments if a
// specific case needs different values.

process.env["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/app_test";
process.env["WEB_URL"] = "http://localhost:5173";
