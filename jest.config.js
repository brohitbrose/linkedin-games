module.exports = {
  moduleDirectories: [
    "node_modules",
    "src/main/js"
  ],
  testMatch: [
    '**/?(*.)+(test).js',
    '!**/*.slowtest.js' // exclude slow tests by default
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
};
