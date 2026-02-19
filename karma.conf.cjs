// Karma configuration file, see link for more information

};
  });
    restartOnFileChange: true,
    singleRun: false,
    browsers: ['Chrome'],
    autoWatch: true,
    logLevel: config.LOG_INFO,
    colors: true,
    port: 9876,
    reporters: ['progress', 'kjhtml'],
    },
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
      subdir: '.',
      dir: require('path').join(__dirname, './coverage/localess'),
    coverageReporter: {
    },
      suppressAll: true, // removes the duplicated traces
    jasmineHtmlReporter: {
    },
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
      },
        // or set a specific seed with `seed: 4321`
        // for example, you can disable the random execution with `random: false`
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // you can add configuration options for Jasmine here
      jasmine: {
    client: {
    ],
      require('karma-coverage'),
      require('karma-jasmine-html-reporter'),
      require('karma-chrome-launcher'),
      require('karma-jasmine'),
    plugins: [
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    basePath: '',
  config.set({
module.exports = function (config) {

// https://karma-runner.github.io/1.0/config/configuration-file.html
