export default {
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/*.spec.ts"],
  testTimeout: 10000,
  moduleFileExtensions: ["ts", "js"],
  // Map .js imports to .ts files for testing
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": "babel-jest",
  },
  collectCoverageFrom: [
    "lib/**/*.ts",
    "!lib/**/*.d.ts",
    "!**/__tests__/**",
  ],
};
