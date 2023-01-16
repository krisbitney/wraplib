module.exports = {
  roots: ["<rootDir>"],
  testMatch: ["**/?(*.)+(spec|test).+(ts|tsx|js)"],
  preset: "ts-jest",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest", {
        tsconfig: "tsconfig.json",
        diagnostics: false
      }]
  },
}

