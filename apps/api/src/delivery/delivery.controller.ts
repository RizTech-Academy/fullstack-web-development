import { Controller, Get } from "@nestjs/common";
import type { DeliveryDay } from "@kirana/shared";

import { DeliveryService } from "./delivery.service";

@Controller("delivery-slots")
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get()
  findAll(): Promise<DeliveryDay[]> {
    return this.delivery.availableDays();
  }
}
