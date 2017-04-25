module.exports = function(grunt) {
  grunt.initConfig({
    browserify: {
        main: {
            src: 'src/*.ts',
            dest: 'dist/bundle.js',
        },
        options: {
            browserifyOptions: {
                debug: true
            },
            configure: function (bundler) {
                bundler.plugin(require('tsify'), { typescript: require('typescript'), global: true });
                bundler.transform(require('babelify'), {
                    presets: ['es2015'],
                    extensions: ['.ts']
                });
            }
        }
    },
    watch: {
      configFiles: {
        files: ['gruntfile.js', 'tsconfig.json','src/*.ts' ],
        tasks: ['default'],
        options: {
          reload: true
        }
      }
    }
  });
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.registerTask("default", ["browserify","watch"]);
};