import { createRouter } from "@tanstack/react-router";
import {
  AppErrorComponent,
  AppNotFoundComponent,
  AppPendingComponent,
} from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: AppNotFoundComponent,
    defaultPendingComponent: AppPendingComponent,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });
}