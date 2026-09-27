# 11. No implicit conversion in the validation pipe

Date: 2026-09-27
Status: Accepted

## Context

`ValidationPipe` accepts `transformOptions: { enableImplicitConversion: true }`,
which converts query strings to the TypeScript types declared on a DTO. It is
widely recommended and it saves writing `@Type(() => Number)` on numeric fields.

Our `QueryProductsDto` has a boolean with an explicit transform:

```typescript
@Transform(({ value }) => value === true || value === "true")
@IsBoolean()
inStock?: boolean;
```

## Decision

Do **not** enable implicit conversion. Convert explicitly with
`@Type(() => Number)` and `@Transform`.

## Consequences

**Good**

- `?inStock=false` arrives as `false`. With implicit conversion on it arrives
  as `true`, because the implicit converter runs its own boolean coercion and
  overrides the explicit transform.
- What the DTO says is what happens.

**Bad**

- Every numeric query field needs `@Type(() => Number)`. Three extra decorators
  across this DTO.

## Evidence

```
plainToInstance(Dto, { inStock: "false" }, { enableImplicitConversion: true })
  => { inStock: true }

plainToInstance(Dto, { inStock: "false" }, { enableImplicitConversion: false })
  => { inStock: false }
```

The failure is silent: no error, and a filter that does the opposite of what was
asked. Found by testing the endpoint rather than by reading the code.
