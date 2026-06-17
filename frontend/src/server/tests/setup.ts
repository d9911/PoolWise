/**
 * Vitest setup. We don't rely on @testing-library/jest-dom matchers for the
 * money/service tests, but importing it keeps component tests (later) working.
 */
import '@testing-library/jest-dom/vitest';
