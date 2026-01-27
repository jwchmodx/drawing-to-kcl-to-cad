import '@testing-library/jest-dom';

// Provide a default mock for fetch that tests can override as needed.
global.fetch = jest.fn();

