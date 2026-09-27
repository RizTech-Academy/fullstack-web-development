import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import { MAX_CART_QUANTITY } from "@kirana/shared";

export class UpdateItemDto {
  /**
   * Zero is allowed and means "remove".
   *
   * The alternative — rejecting 0 and making the client call DELETE — turns
   * every quantity stepper into two code paths, and the one that fires when
   * somebody taps minus on the last item is the one nobody tests.
   */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_CART_QUANTITY)
  quantity!: number;
}
