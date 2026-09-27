import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom keeps the document between tests. Without this, the second test in a
// file finds two copies of everything and `getByRole` throws.
afterEach(cleanup);
