import { Global, Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

// Global because orders, checkout and admin all send, and threading it through
// three module imports buys nothing.
@Global()
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
