# Tech Stack Detection Heuristics

## Languages

| Indicator | Rule file |
|-----------|-----------|
| `Gemfile` or `.ruby-version` | `languages/ruby` |
| `package.json` or `tsconfig.json` | `languages/typescript` |
| `package.json` (without tsconfig) | `languages/javascript` |
| `pyproject.toml`, `requirements.txt`, `setup.py` | `languages/python` |
| `go.mod` | `languages/go` |
| `Cargo.toml` | `languages/rust` |
| `pom.xml`, `build.gradle` | `languages/java` |
| `composer.json` | `languages/php` |

## Frameworks

| Indicator | Rule file |
|-----------|-----------|
| `config/routes.rb` (Rails) | `frameworks/rails` |
| `app/controllers/` exists | `frameworks/rails-controllers` |
| `app/models/` exists | `frameworks/rails-models` |
| `app/views/` exists | `frameworks/rails-views` |
| `db/migrate/` exists | `frameworks/rails-migrations` |
| `config/routes.rb` exists | `frameworks/rails-routes` |
| `spec/` exists (with Rails) | `frameworks/rails-specs` |
| `react` in package.json deps | `frameworks/react` |
| `next` in package.json deps | `frameworks/nextjs` |
| `vue` in package.json deps | `frameworks/vue` |
| `@hotwired/stimulus` in deps | `frameworks/stimulus` |
| `@mantine/core` in deps | `frameworks/mantine` |
| `@radix-ui/*` or `shadcn` config | `frameworks/shadcn` |
| `firebase` in deps | `frameworks/firebase` |
| `@playwright/test` in deps | `frameworks/playwright` |
| `vitest` in deps | `frameworks/vitest` |
| `react-router` in deps | `frameworks/react-router` |

## Integrations (dependency-based)

| Indicator (Gemfile gem) | Rule file |
|-------------------------|-----------|
| `devise` | `integrations/rails-devise` |
| `pundit` | `integrations/rails-pundit` |
| `turbo-rails` | `integrations/rails-turbo` |
| `stimulus-rails` | `integrations/rails-stimulus` |
| `view_component` | `integrations/rails-view-component` |
| `good_job` | `integrations/rails-good-job` |
| `carrierwave` | `integrations/rails-carrierwave` |
| `enumerize` | `integrations/rails-enumerize` |
| `stripe` gem or `stripe` npm | `integrations/rails-stripe` |
| `graphql` gem | `integrations/rails-graphql` |
| `draper` | `integrations/rails-draper` |
| `rewrap` | `integrations/rails-rewrap` |
