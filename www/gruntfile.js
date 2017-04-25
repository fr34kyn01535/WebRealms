module.exports = function(grunt) {
  grunt.initConfig({
    browserify: {
        main: {
            src: ['src/*.ts'],
            dest: 'dist/bundle.js',
        },
        options: {
            browserifyOptions: {
                debug: true
            },
            configure: function (bundler) {
                bundler.plugin(require('tsify'), { typescript: require('typescript'), global: false });
                bundler.transform(require('babelify'), {
                    presets: ['es2015'],
                    extensions: ['.ts']
                });
            }
        }
    },
    uglify: {
      main: {
        files: {
          'dist/bundle.min.js': ['dist/bundle.js']
        }
      },
      options: {
        sourceMap: true
      }
    },
    inject: {
      main: {
        scriptSrc: ['src/livereload.js','dist/bundle.min.js'],
        files: {
          'index.html': 'src/index.html'
        }
      }
    },
    watch: {
      main: {
        files: ['gruntfile.js', 'tsconfig.json','src/*'],
        tasks: ['build'],
        options: {
          spawn : true,
          reload: true
        }
      },
      bundle:{
        files: ['index.html'],
        options: {
          spawn : true,
          livereload: true, 
          livereloadOnError: false
        }
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-inject');
  grunt.registerTask("default", ["build","watch"]);
  grunt.registerTask("build", ["browserify","uglify","inject"]);
  
};