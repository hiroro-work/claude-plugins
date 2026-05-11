# Integration Library Criteria

Reference guide for detecting and handling integration libraries in layered frameworks.

## Integration vs Layer distinction

- **Layer**: Inherent architectural division (models, controllers, views) — removing it breaks the framework
- **Integration**: Optional library adding patterns to existing layers — removable without breaking the framework's core

## Detection

Check dependency files for integration libraries when a layered framework is detected:

| Dependency file | Library | Integration |
|----------------|---------|-------------|
| Gemfile | `inertia_rails` | Inertia |
| Gemfile | `pundit` | Pundit |
| Gemfile | `devise` | Devise |
| Gemfile | `turbo-rails` | Turbo |
| package.json | `@inertiajs/react` | Inertia |
| requirements.txt / pyproject.toml | `django-ninja` | Django Ninja |

This list is not exhaustive — detect other integration libraries using similar criteria.

## Pattern routing

When analyzing layer code (Step 4), if a pattern uses APIs/modules from a detected integration library (e.g., `render inertia:`, `inertia_location`, Inertia shared data), route it to the integration's category instead of the layer's category. Framework-native patterns stay in the layer's category.

## Output structure

- `integrations/<framework>-<integration>.md` with `paths:` scoped to layers where the integration is used
- Framework name is included because rules differ by host framework (e.g., Rails: `render inertia:` vs Laravel: `Inertia::render()`)
- In split mode, integration files also get `.local.md` counterparts
