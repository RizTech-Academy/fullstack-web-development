import { formatPaise, pricePerUnit, type VariantSummary } from "@kirana/shared";

export function Price({ variant }: { variant: VariantSummary }) {
  const perUnit = pricePerUnit(variant);
  const saving =
    variant.mrpPaise && variant.mrpPaise > variant.pricePaise
      ? Math.round(
          ((variant.mrpPaise - variant.pricePaise) / variant.mrpPaise) * 100,
        )
      : null;

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-lg font-semibold">{formatPaise(variant.pricePaise)}</span>

      {variant.mrpPaise !== null && saving !== null && (
        <>
          <span className="text-sm text-gray-500 line-through">
            {formatPaise(variant.mrpPaise)}
          </span>
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
            {saving}% off
          </span>
        </>
      )}

      {perUnit && (
        <span className="text-xs text-gray-500">
          {formatPaise(perUnit.paise)}/{perUnit.unit}
        </span>
      )}
    </div>
  );
}
